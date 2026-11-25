const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Event = require('../models/Event');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const DRSDuty = require('../models/DRSDuty');
const {
    EventImportBatch,
    EventImportSourceRow,
    EventGuestMovement,
    EventDuty,
    EventDutyChange,
    EventOutboxEvent
} = require('../models/EventExcelModels');
const {
    calculateDeparturePickup,
    autoDetectHeaderAndMapping,
    expandMappedRowToMovements,
    reconcileBatchMovements,
    proposeDuties,
    checkVehicleTurnaroundOverlap,
    calculateDisposalBilling,
    normalizePlate,
    normalizeTimeValue,
    normalizeDateValue
} = require('../services/eventExcelEngine');
const {
    syncDutyToModules,
    syncLegacyEventEmbeddedDuties
} = require('../services/eventOutboxSync');

async function getNextDutyNumber(eventId) {
    const existing = await EventDuty.find({ event: eventId }).select('dutyId').lean();
    let maxNum = 0;
    existing.forEach(d => {
        const m = String(d.dutyId || '').match(/LK-(\d+)/i);
        if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
        }
    });
    return maxNum + 1;
}

async function migrateLegacyDutiesIfNeeded(event) {
    const existingCount = await EventDuty.countDocuments({ event: event._id });
    if (existingCount === 0 && Array.isArray(event.excelDuties) && event.excelDuties.length > 0) {
        const docs = [];
        for (let i = 0; i < event.excelDuties.length; i++) {
            const legacy = event.excelDuties[i];
            const dutyId = legacy.dutyId || `LK-${String(i + 1).padStart(3, '0')}`;
            docs.push({
                company: event.company,
                event: event._id,
                dutyId,
                version: 1,
                guestGroup: legacy.guestGroup || 'Guest Group',
                pax: Number(legacy.pax) || 1,
                carType: legacy.carType || 'Crysta',
                serviceType: legacy.serviceType || 'ARRIVAL',
                pickupDate: legacy.pickupDate || '',
                guestPickup: legacy.guestPickup || '',
                flightDate: legacy.flightDate || '',
                flightTime: legacy.flightTime || '',
                flightNumber: legacy.flightNumber || '',
                pickupPoint: legacy.pickupPoint || '',
                dropLocation: legacy.dropLocation || '',
                vehicleNumber: legacy.vehicleNumber || '',
                driverName: legacy.driverName || '',
                driverPhone: legacy.driverPhone || '',
                vehicleSource: legacy.vehicleSource || 'Own',
                vendorName: legacy.vendorName || '',
                vendorCost: Number(legacy.vendorCost) || 0,
                dutyAmount: Number(legacy.dutyAmount) || 0,
                status: legacy.status || 'Scheduled',
                rawSourceSheet: legacy.rawSourceSheet || '',
                rawSourceRow: Number(legacy.rawSourceRow) || 0,
                sourceRef: legacy.sourceRef || '',
                disposalHours: Number(legacy.disposalHours) || 8,
                disposalKm: Number(legacy.disposalKm) || 80,
                intercityRoute: legacy.intercityRoute || '',
                remarks: legacy.remarks || '',
                guests: [{
                    guestGroup: legacy.guestGroup || 'Guest Group',
                    pax: Number(legacy.pax) || 1
                }],
                syncStatus: 'Pending'
            });
        }
        if (docs.length > 0) {
            await EventDuty.insertMany(docs, { ordered: false }).catch(() => {});
        }
    }
}

async function findDutyByParam(eventId, dutyParam) {
    if (mongoose.Types.ObjectId.isValid(dutyParam)) {
        const byId = await EventDuty.findOne({ _id: dutyParam, event: eventId });
        if (byId) return byId;
    }
    return EventDuty.findOne({ event: eventId, dutyId: dutyParam });
}

// @desc    Upload workbook into Staging Batch & preserve immutable Source Rows
// @route   POST /api/admin/events/:id/imports
// @access  Private/Admin
const createImportBatch = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let workbookSheets = {}; // { sheetName: rows2D[] }
    let fileName = req.body.fileName || 'client_workbook.xlsx';

    if (req.file && req.file.buffer) {
        fileName = req.file.originalname || fileName;
        const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
        (wb.SheetNames || []).forEach(sName => {
            const ws = wb.Sheets[sName];
            const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (rows2D && rows2D.length > 0) {
                workbookSheets[sName] = rows2D;
            }
        });
    } else if (req.body.sheets && typeof req.body.sheets === 'object') {
        workbookSheets = req.body.sheets;
    } else {
        return res.status(400).json({ message: 'Please upload an Excel/CSV workbook or provide parsed sheets.' });
    }

    const latestBatch = await EventImportBatch.findOne({ event: event._id }).sort({ revisionNumber: -1 }).lean();
    const revisionNumber = (latestBatch?.revisionNumber || 0) + 1;

    const sheetNames = Object.keys(workbookSheets);
    const sheetConfigs = [];
    const sourceRowDocs = [];
    const batchId = new mongoose.Types.ObjectId();

    sheetNames.forEach(sheetName => {
        const rows2D = workbookSheets[sheetName] || [];
        const nonEmptyRows = rows2D.filter(r => Array.isArray(r) && r.some(cell => String(cell ?? '').trim() !== ''));
        const detected = autoDetectHeaderAndMapping(rows2D, sheetName);

        sheetConfigs.push({
            sheetName,
            selected: nonEmptyRows.length > 1,
            headerRowIndex: detected.headerRowIndex,
            totalRows: rows2D.length,
            headers: detected.headers,
            columnMap: detected.columnMap,
            isDispatchSideBySide: detected.isDispatchSideBySide,
            sampleRows: rows2D.slice(0, 12)
        });

        rows2D.forEach((rawRowArr, idx) => {
            if (!Array.isArray(rawRowArr) || !rawRowArr.some(c => String(c ?? '').trim() !== '')) return;
            sourceRowDocs.push({
                company: event.company,
                event: event._id,
                batch: batchId,
                sheetName,
                rowNumber: idx + 1,
                externalRef: '',
                rawData: rawRowArr
            });
        });
    });

    const batch = await EventImportBatch.create({
        _id: batchId,
        company: event.company,
        event: event._id,
        revisionNumber,
        fileName,
        uploadedBy: req.user?._id || null,
        uploadedByName: req.user?.name || 'Admin',
        sheetConfigs,
        status: 'Staged',
        rawRowsCount: sourceRowDocs.length
    });

    if (sourceRowDocs.length > 0) {
        await EventImportSourceRow.insertMany(sourceRowDocs, { ordered: false });
    }

    res.status(201).json({
        batch,
        savedTemplates: event.mappingTemplates || []
    });
});

// @desc    Apply per-sheet header row & column mappings and run reconciliation
// @route   POST /api/admin/events/:id/imports/:batchId/map
// @access  Private/Admin
const mapImportBatch = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const batch = await EventImportBatch.findOne({ _id: req.params.batchId, event: event._id });
    if (!batch) return res.status(404).json({ message: 'Import batch not found' });

    const { sheetConfigs, saveTemplateName } = req.body;
    if (Array.isArray(sheetConfigs) && sheetConfigs.length > 0) {
        batch.sheetConfigs = sheetConfigs;
    }

    const sourceRows = await EventImportSourceRow.find({ batch: batch._id }).sort({ sheetName: 1, rowNumber: 1 }).lean();
    const rowsBySheet = {};
    sourceRows.forEach(sr => {
        if (!rowsBySheet[sr.sheetName]) rowsBySheet[sr.sheetName] = [];
        rowsBySheet[sr.sheetName].push(sr);
    });

    const eventYear = event.startDate
        ? new Date(event.startDate).getFullYear()
        : (event.date ? new Date(event.date).getFullYear() : 2026);
    const cfg = {
        departureLeadMinutes: Number(event.excelConfig?.departureLeadMinutes) || 120,
        stationLeadMinutes: Number(event.excelConfig?.stationLeadMinutes) || 60,
        disposalHours: Number(event.excelConfig?.disposalHours) || 8,
        disposalKm: Number(event.excelConfig?.disposalKm) || 80,
        timezone: event.excelConfig?.timezone || 'Asia/Kolkata',
        defaultYear: eventYear,
        defaultHotel: event.location || 'Hotel'
    };

    const candidateMovements = [];
    let selectedRawRowsCount = 0;

    for (const sc of (batch.sheetConfigs || [])) {
        if (!sc.selected) continue;
        const sheetSourceRows = rowsBySheet[sc.sheetName] || [];
        const headerRowNum = (Number(sc.headerRowIndex) || 0) + 1;
        const headerSource = sheetSourceRows.find(r => r.rowNumber === headerRowNum) || sheetSourceRows[0];
        const headers = Array.isArray(headerSource?.rawData) ? headerSource.rawData.map(h => String(h || '').trim()) : (sc.headers || []);
        sc.headers = headers.filter(Boolean);

        const colMap = sc.columnMap || {};

        for (const sr of sheetSourceRows) {
            if (sr.rowNumber <= headerRowNum) continue;
            selectedRawRowsCount++;
            const rowObj = {};
            if (Array.isArray(sr.rawData)) {
                headers.forEach((h, i) => {
                    if (h) rowObj[h] = sr.rawData[i];
                });
            } else if (sr.rawData && typeof sr.rawData === 'object') {
                Object.assign(rowObj, sr.rawData);
            }

            const expanded = expandMappedRowToMovements(
                rowObj,
                {
                    batchId: batch._id,
                    sourceRowId: String(sr._id),
                    sheetName: sc.sheetName,
                    rowNumber: sr.rowNumber
                },
                colMap,
                cfg
            );
            expanded.forEach(m => {
                candidateMovements.push({
                    ...m,
                    company: event.company,
                    event: event._id,
                    batch: batch._id
                });
            });
        }
    }

    // Save template if requested
    if (saveTemplateName && String(saveTemplateName).trim()) {
        const firstSelected = (batch.sheetConfigs || []).find(s => s.selected) || {};
        event.mappingTemplates = (event.mappingTemplates || []).filter(t => t.name !== saveTemplateName.trim());
        event.mappingTemplates.push({
            name: saveTemplateName.trim(),
            headerRowIndex: Number(firstSelected.headerRowIndex) || 0,
            columnMap: firstSelected.columnMap || {}
        });
        batch.mappingTemplateName = saveTemplateName.trim();
        await event.save();
    }

    // Replace previous candidate movements of THIS batch cleanly
    await EventGuestMovement.deleteMany({ batch: batch._id });
    const insertedMovements = candidateMovements.length > 0
        ? await EventGuestMovement.insertMany(candidateMovements)
        : [];

    const existingLiveDuties = await EventDuty.find({ event: event._id }).lean();
    const reconciliation = reconcileBatchMovements(
        insertedMovements.map(m => m.toObject ? m.toObject() : m),
        existingLiveDuties
    );

    batch.rawRowsCount = selectedRawRowsCount;
    batch.reconciliationReport = reconciliation;
    batch.status = 'Mapped';
    await batch.save();

    res.json({
        batch,
        movements: insertedMovements,
        reconciliation
    });
});

// @desc    Get reconciliation report for a staged batch
// @route   GET /api/admin/events/:id/imports/:batchId/reconcile
// @access  Private/Admin
const getImportReconcile = asyncHandler(async (req, res) => {
    const batch = await EventImportBatch.findOne({ _id: req.params.batchId, event: req.params.id });
    if (!batch) return res.status(404).json({ message: 'Import batch not found' });

    const movements = await EventGuestMovement.find({ batch: batch._id }).lean();
    const existingLiveDuties = await EventDuty.find({ event: req.params.id }).lean();
    const reconciliation = reconcileBatchMovements(movements, existingLiveDuties);

    res.json({
        batch,
        movements,
        reconciliation,
        decisions: batch.operatorDecisions || {},
        consolidationGroups: batch.consolidationGroups || []
    });
});

// @desc    Save operator decisions for duplicates, changes, missing details & consolidation groups
// @route   POST /api/admin/events/:id/imports/:batchId/decisions
// @access  Private/Admin
const saveImportDecisions = asyncHandler(async (req, res) => {
    const batch = await EventImportBatch.findOne({ _id: req.params.batchId, event: req.params.id });
    if (!batch) return res.status(404).json({ message: 'Import batch not found' });

    const { decisions = {}, consolidationGroups, movementPatches = [] } = req.body;
    const mergedDecisions = { ...(batch.operatorDecisions || {}), ...decisions };

    // Apply any explicit missing-detail field patches on staged movements
    for (const patch of movementPatches) {
        if (!patch.movementId && !patch.movementKey) continue;
        const q = patch.movementId
            ? { _id: patch.movementId, batch: batch._id }
            : { movementKey: patch.movementKey, batch: batch._id };
        const mov = await EventGuestMovement.findOne(q);
        if (!mov) continue;

        if (patch.carType !== undefined) {
            mov.carType = patch.carType;
            mov.carTypeMissing = !patch.carType;
        }
        if (patch.guestPickup !== undefined) {
            mov.guestPickup = patch.guestPickup;
            mov.pickupConfirmed = true;
            mov.needsPickupConfirm = false;
        }
        if (patch.pickupDate !== undefined) mov.pickupDate = patch.pickupDate;
        if (patch.pickupPoint !== undefined) mov.pickupPoint = patch.pickupPoint;
        if (patch.dropLocation !== undefined) mov.dropLocation = patch.dropLocation;
        if (patch.pickupConfirmed !== undefined) {
            mov.pickupConfirmed = Boolean(patch.pickupConfirmed);
            mov.needsPickupConfirm = !mov.pickupConfirmed;
        }
        await mov.save();
    }

    // Apply duplicate decisions to staged movements (NEVER deleting source rows!)
    for (const [itemId, dec] of Object.entries(decisions)) {
        const action = typeof dec === 'string' ? dec : dec?.action;
        if (itemId.startsWith('dup-') && action === 'same_movement') {
            const primaryKey = itemId.replace(/^dup-/, '');
            const primaryMov = await EventGuestMovement.findOne({ batch: batch._id, movementKey: primaryKey });
            const dupKeys = Array.isArray(dec?.duplicateMovementKeys)
                ? dec.duplicateMovementKeys
                : (batch.reconciliationReport?.possibleDuplicates?.find(d => d.id === itemId)?.duplicates || []).map(x => x.movement?.movementKey).filter(Boolean);

            if (primaryMov && dupKeys.length > 0) {
                for (const dk of dupKeys) {
                    const sec = await EventGuestMovement.findOne({ batch: batch._id, movementKey: dk });
                    if (sec && sec.status !== 'MergedDuplicate') {
                        primaryMov.sourceLinks = [...(primaryMov.sourceLinks || []), ...(sec.sourceLinks || [])];
                        primaryMov.reconciliationNote = `Merged duplicate with ${sec.sourceSheet} row ${sec.sourceRow}`;
                        sec.status = 'MergedDuplicate';
                        sec.reconciliationNote = `Merged into ${primaryMov.sourceSheet} row ${primaryMov.sourceRow}`;
                        await sec.save();
                    }
                }
                await primaryMov.save();
            }
        }
        if (itemId.startsWith('mis-') && action === 'confirm_pickup') {
            const key = itemId.replace(/^mis-/, '');
            await EventGuestMovement.updateOne(
                { batch: batch._id, movementKey: key },
                { $set: { pickupConfirmed: true, needsPickupConfirm: false } }
            );
        }
        if (action === 'skip') {
            const key = itemId.replace(/^(dup-|chg-|mis-)/, '');
            await EventGuestMovement.updateOne(
                { batch: batch._id, movementKey: key },
                { $set: { status: 'Skipped' } }
            );
        }
    }

    if (Array.isArray(consolidationGroups)) {
        batch.consolidationGroups = consolidationGroups;
    }

    batch.operatorDecisions = mergedDecisions;
    batch.status = 'Reconciled';
    await batch.save();

    const activeMovements = await EventGuestMovement.find({
        batch: batch._id,
        status: { $nin: ['MergedDuplicate', 'Skipped'] }
    }).lean();

    const existingLiveDuties = await EventDuty.find({ event: req.params.id }).lean();
    const startSeq = await getNextDutyNumber(req.params.id);
    const proposedDuties = proposeDuties(activeMovements, batch.consolidationGroups || [], startSeq);
    const reconciliation = reconcileBatchMovements(activeMovements, existingLiveDuties);

    res.json({
        batch,
        movements: activeMovements,
        proposedDuties,
        reconciliation
    });
});

// @desc    Idempotently commit approved movements & car groups to Live Event Duties
// @route   POST /api/admin/events/:id/imports/:batchId/commit
// @access  Private/Admin
const commitImportBatch = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const batch = await EventImportBatch.findOne({ _id: req.params.batchId, event: event._id });
    if (!batch) return res.status(404).json({ message: 'Import batch not found' });

    // Idempotent check
    if (batch.status === 'Committed') {
        const existingDuties = await EventDuty.find({ event: event._id }).sort({ pickupDate: 1, guestPickup: 1, dutyId: 1 }).lean();
        return res.json({
            alreadyCommitted: true,
            message: 'This import batch was already committed.',
            duties: existingDuties
        });
    }

    const { consolidationGroups } = req.body;
    if (Array.isArray(consolidationGroups)) {
        batch.consolidationGroups = consolidationGroups;
    }

    const decisions = batch.operatorDecisions || {};
    const report = batch.reconciliationReport || {};
    const changedItems = report.changedItems || [];

    // 1. Handle Revision Changes matched to existing Live Duties
    const revisionConsumedMovementKeys = new Set();
    for (const chg of changedItems) {
        const candKey = chg.candidate?.movementKey;
        if (candKey) revisionConsumedMovementKeys.add(candKey);

        const dec = decisions[chg.id];
        const action = typeof dec === 'string' ? dec : dec?.action;
        if (action !== 'accept_change') continue;

        const liveDuty = await EventDuty.findOne({ event: event._id, dutyId: chg.dutyId });
        if (!liveDuty) continue;

        if ((liveDuty.status === 'Completed' || liveDuty.isLocked) && !dec?.forceUnlockReason) {
            continue;
        }

        const cand = chg.candidate;
        const fields = ['pax', 'carType', 'pickupDate', 'guestPickup', 'flightDate', 'flightTime', 'flightNumber', 'pickupPoint', 'dropLocation'];
        for (const f of fields) {
            if (cand[f] !== undefined && String(liveDuty[f] ?? '') !== String(cand[f] ?? '')) {
                await EventDutyChange.create({
                    company: event.company,
                    event: event._id,
                    duty: liveDuty._id,
                    dutyId: liveDuty.dutyId,
                    version: liveDuty.version + 1,
                    changeType: 'RevisionApply',
                    field: f,
                    oldValue: liveDuty[f],
                    newValue: cand[f],
                    reason: dec?.reason || `Client Revision #${batch.revisionNumber}`,
                    batchId: batch._id,
                    changedBy: req.user?._id || null,
                    changedByName: req.user?.name || 'Admin'
                });
                liveDuty[f] = cand[f];
            }
        }
        liveDuty.sourceLinks = [...(liveDuty.sourceLinks || []), ...(cand.sourceLinks || [])];
        liveDuty.version += 1;
        await liveDuty.save();
        await syncDutyToModules(liveDuty, event, { pickupTimeOnly: true });
    }

    // 2. Skip unchanged items from re-creating duplicates
    (report.unchangedItems || []).forEach(u => {
        if (u.candidate?.movementKey) revisionConsumedMovementKeys.add(u.candidate.movementKey);
    });

    // 3. Create NEW vehicle duties for remaining active movements
    const activeMovements = await EventGuestMovement.find({
        batch: batch._id,
        status: { $nin: ['MergedDuplicate', 'Skipped', 'Approved'] }
    }).lean();

    const newMovementsToCommit = activeMovements.filter(m => !revisionConsumedMovementKeys.has(m.movementKey));
    const startSeq = await getNextDutyNumber(event._id);
    const proposed = proposeDuties(newMovementsToCommit, batch.consolidationGroups || [], startSeq);

    const createdDuties = [];
    for (const p of proposed) {
        const created = await EventDuty.create({
            company: event.company,
            event: event._id,
            ...p,
            version: 1,
            status: 'Scheduled',
            syncStatus: 'Pending'
        });

        await EventDutyChange.create({
            company: event.company,
            event: event._id,
            duty: created._id,
            dutyId: created.dutyId,
            version: 1,
            changeType: 'Created',
            field: 'duty',
            oldValue: null,
            newValue: `${created.guestGroup} (${created.pax} PAX) • ${created.serviceType}`,
            reason: `Committed from Import Batch #${batch.revisionNumber} (${batch.fileName})`,
            batchId: batch._id,
            changedBy: req.user?._id || null,
            changedByName: req.user?.name || 'Admin'
        });

        // Mark source guest movements as Approved
        const memberIds = (p.guests || []).map(g => g.movementId).filter(Boolean);
        if (memberIds.length > 0) {
            await EventGuestMovement.updateMany(
                { _id: { $in: memberIds } },
                { $set: { status: 'Approved', approvedDutyRef: created._id } }
            );
        }

        await syncDutyToModules(created, event);
        createdDuties.push(created);
    }

    // Persist review_later alerts onto Event alerts
    const pendingAlerts = [];
    (report.possibleDuplicates || []).forEach(dup => {
        const dAction = typeof decisions[dup.id] === 'string' ? decisions[dup.id] : decisions[dup.id]?.action;
        if (!dAction || dAction === 'review_later') {
            pendingAlerts.push({
                id: dup.id,
                type: 'duplicate',
                title: `Potential duplicate: ${dup.primary?.guestGroup}`,
                description: dup.summary,
                status: 'pending',
                sourceInfo: dup.summary
            });
        }
    });
    createdDuties.forEach(d => {
        if (d.serviceType === 'DEPARTURE' && d.flightTime && !d.pickupConfirmed) {
            pendingAlerts.push({
                id: `pickup-${d.dutyId}`,
                type: 'pickup_confirm',
                title: 'Guest pickup needs confirmation',
                description: `Departure duty ${d.dutyId} (${d.guestGroup}) • Flight ${d.flightTime} • Suggested pickup ${d.guestPickup} (${d.pickupLeadMinutes}m lead)`,
                dutyId: d.dutyId,
                status: 'pending'
            });
        }
    });

    const totalApprovedMovements = await EventGuestMovement.countDocuments({ event: event._id, status: 'Approved' });
    const totalRawRows = await EventImportSourceRow.countDocuments({ event: event._id });

    event.rawWorkbookRowsCount = totalRawRows || batch.rawRowsCount;
    event.uniqueGuestGroupsCount = totalApprovedMovements || proposed.length;
    if (pendingAlerts.length > 0) {
        const existingPending = (event.reconciliationAlerts || []).filter(a => a.status === 'pending');
        const mapById = new Map(existingPending.map(a => [a.id, a]));
        pendingAlerts.forEach(a => mapById.set(a.id, a));
        event.reconciliationAlerts = Array.from(mapById.values());
    }
    await event.save();

    batch.status = 'Committed';
    batch.committedAt = new Date();
    await batch.save();

    await syncLegacyEventEmbeddedDuties(event._id);

    const allDuties = await EventDuty.find({ event: event._id }).sort({ pickupDate: 1, guestPickup: 1, dutyId: 1 }).lean();
    res.json({
        message: `Committed ${createdDuties.length} duties from Revision #${batch.revisionNumber}`,
        createdCount: createdDuties.length,
        duties: allDuties
    });
});

// @desc    Get Live Event Sheet duties, counts, outbox sync, vehicles & calendar
// @route   GET /api/admin/events/:id/duties
// @access  Private/Admin
const getEventDutiesSheet = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    await migrateLegacyDutiesIfNeeded(event);

    const [duties, drsDutiesCount, fleetVehicles, drivers, existingVendorNames, outboxFailedCount, recentBatches, totalRawRows, totalUniqueGroups] = await Promise.all([
        EventDuty.find({ event: event._id }).sort({ pickupDate: 1, guestPickup: 1, dutyId: 1 }).lean(),
        DRSDuty.countDocuments({ eventId: event._id, status: { $ne: 'Cancelled' } }),
        Vehicle.find({ company: event.company, isOutsideCar: { $ne: true }, status: 'active' })
            .select('_id carNumber model carType currentDriver')
            .populate('currentDriver', 'name mobile phone')
            .lean(),
        User.find({ company: event.company, role: 'Driver', status: 'active' }).select('_id name mobile phone').lean(),
        Vehicle.distinct('ownerName', { company: event.company, isOutsideCar: true, ownerName: { $ne: '' } }),
        EventOutboxEvent.countDocuments({ event: event._id, status: 'Failed' }),
        EventImportBatch.find({ event: event._id }).sort({ revisionNumber: -1 }).limit(10)
            .select('_id revisionNumber fileName status rawRowsCount sheetConfigs reconciliationReport operatorDecisions createdAt committedAt').lean(),
        EventImportSourceRow.countDocuments({ event: event._id }),
        EventGuestMovement.countDocuments({ event: event._id, status: { $nin: ['MergedDuplicate', 'Skipped'] } })
    ]);

    const turnaroundMin = Number(event.excelConfig?.defaultTurnaroundMinutes) || 30;
    const activeDuties = duties.filter(d => d.status !== 'Cancelled');

    // Annotate each duty with live turnaround conflict status & build Master Calendar grouping
    const vehicleCalendarMap = new Map();
    const annotatedDuties = duties.map(d => {
        const conflictCheck = d.vehicleNumber && d.status !== 'Cancelled'
            ? checkVehicleTurnaroundOverlap(d, activeDuties, turnaroundMin)
            : { conflict: false, overlappingDuties: [] };

        if (d.vehicleNumber && d.status !== 'Cancelled') {
            const key = normalizePlate(d.vehicleNumber);
            if (!vehicleCalendarMap.has(key)) {
                vehicleCalendarMap.set(key, {
                    vehicleNumber: d.vehicleNumber,
                    vehicleSource: d.vehicleSource,
                    carType: d.carType,
                    vendorName: d.vendorName || '',
                    duties: []
                });
            }
            vehicleCalendarMap.get(key).duties.push({
                _id: d._id,
                dutyId: d.dutyId,
                guestGroup: d.guestGroup,
                serviceType: d.serviceType,
                pickupDate: d.pickupDate,
                guestPickup: d.guestPickup,
                pickupPoint: d.pickupPoint,
                dropLocation: d.dropLocation,
                status: d.status,
                hasConflict: conflictCheck.conflict
            });
        }

        return {
            ...d,
            turnaroundConflict: conflictCheck.conflict,
            turnaroundMessage: conflictCheck.message || ''
        };
    });

    const distinctVehicles = new Set(activeDuties.map(d => normalizePlate(d.vehicleNumber)).filter(Boolean));
    const vendorDutiesCount = activeDuties.filter(d => d.vehicleSource === 'Vendor').length;

    res.json({
        event: {
            _id: event._id,
            name: event.name,
            client: event.client,
            date: event.date,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location,
            status: event.status,
            rateCard: event.rateCard || [],
            mappingTemplates: event.mappingTemplates || []
        },
        duties: annotatedDuties,
        excelConfig: {
            departureLeadMinutes: Number(event.excelConfig?.departureLeadMinutes) || 120,
            stationLeadMinutes: Number(event.excelConfig?.stationLeadMinutes) || 60,
            defaultTurnaroundMinutes: turnaroundMin,
            disposalHours: Number(event.excelConfig?.disposalHours) || 8,
            disposalKm: Number(event.excelConfig?.disposalKm) || 80,
            intercityRouteNotes: event.excelConfig?.intercityRouteNotes || '',
            timezone: event.excelConfig?.timezone || 'Asia/Kolkata'
        },
        reconciliationAlerts: event.reconciliationAlerts || [],
        counts: {
            rawRows: totalRawRows || event.rawWorkbookRowsCount || activeDuties.length,
            uniqueGuestGroups: totalUniqueGroups || event.uniqueGuestGroupsCount || activeDuties.length,
            vehicleDuties: activeDuties.length,
            distinctVehicles: distinctVehicles.size,
            drsDuties: drsDutiesCount,
            vendorDuties: vendorDutiesCount,
            outboxFailed: outboxFailedCount
        },
        fleetVehicles,
        drivers,
        vendors: (existingVendorNames || []).filter(Boolean),
        importBatches: recentBatches,
        vehicleCalendar: Array.from(vehicleCalendarMap.values())
    });
});

// @desc    Create a manual duty in Live Event Sheet
// @route   POST /api/admin/events/:id/duties
// @access  Private/Admin
const createEventDuty = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const seq = await getNextDutyNumber(event._id);
    const dutyId = req.body.dutyId || `LK-${String(seq).padStart(3, '0')}`;
    const serviceType = (req.body.serviceType || 'ARRIVAL').toUpperCase();
    const timezone = event.excelConfig?.timezone || 'Asia/Kolkata';

    let pickupDate = req.body.pickupDate || (event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : new Date(event.date || Date.now()).toISOString().split('T')[0]);
    let guestPickup = req.body.guestPickup || '10:00';
    const flightDate = req.body.flightDate || '';
    const flightTime = req.body.flightTime || '';
    const isStation = Boolean(req.body.isStation);
    const leadMin = req.body.pickupLeadMinutes !== undefined
        ? Number(req.body.pickupLeadMinutes)
        : (serviceType === 'DEPARTURE' ? (isStation ? (Number(event.excelConfig?.stationLeadMinutes) || 60) : (Number(event.excelConfig?.departureLeadMinutes) || 120)) : 0);

    if (serviceType === 'DEPARTURE' && flightTime && !req.body.manualPickupOverride) {
        const calc = calculateDeparturePickup(flightDate || pickupDate, flightTime, leadMin, timezone);
        pickupDate = calc.pickupDate;
        guestPickup = calc.pickupTime;
    }

    const created = await EventDuty.create({
        company: event.company,
        event: event._id,
        dutyId,
        version: 1,
        guestGroup: req.body.guestGroup || 'New Guest / Group',
        pax: Number(req.body.pax) || 1,
        carType: req.body.carType || 'Crysta',
        serviceType,
        isStation,
        pickupDate,
        guestPickup,
        flightDate,
        flightTime,
        flightNumber: req.body.flightNumber || '',
        pickupLeadMinutes: leadMin,
        manualPickupOverride: Boolean(req.body.manualPickupOverride),
        pickupConfirmed: Boolean(req.body.pickupConfirmed),
        pickupPoint: req.body.pickupPoint || event.location || 'Airport',
        dropLocation: req.body.dropLocation || 'Hotel',
        disposalPackage: req.body.disposalPackage || `${Number(event.excelConfig?.disposalHours) || 8}h / ${Number(event.excelConfig?.disposalKm) || 80}km`,
        disposalHours: Number(req.body.disposalHours) || Number(event.excelConfig?.disposalHours) || 8,
        disposalKm: Number(req.body.disposalKm) || Number(event.excelConfig?.disposalKm) || 80,
        intercityRoute: req.body.intercityRoute || '',
        stopovers: req.body.stopovers || '',
        vehicleNumber: req.body.vehicleNumber || '',
        vehicleSource: req.body.vehicleSource || 'Own',
        vendorName: req.body.vendorName || '',
        vendorCost: Number(req.body.vendorCost) || 0,
        dutyAmount: Number(req.body.dutyAmount) || 0,
        status: req.body.status || 'Scheduled',
        guests: [{
            guestGroup: req.body.guestGroup || 'New Guest / Group',
            pax: Number(req.body.pax) || 1
        }]
    });

    await EventDutyChange.create({
        company: event.company,
        event: event._id,
        duty: created._id,
        dutyId: created.dutyId,
        version: 1,
        changeType: 'Created',
        field: 'duty',
        oldValue: null,
        newValue: `${created.guestGroup} (${created.pax} PAX) • ${created.serviceType}`,
        reason: 'Manual duty added on Live Event Sheet',
        changedBy: req.user?._id || null,
        changedByName: req.user?.name || 'Admin'
    });

    await syncDutyToModules(created, event);
    await syncLegacyEventEmbeddedDuties(event._id);

    res.status(201).json({ duty: created });
});

// @desc    Update duty cell/drawer with optimistic concurrency, audit log, time recalculation & outbox sync
// @route   PATCH /api/admin/events/:id/duties/:dutyId
// @access  Private/Admin
const patchEventDuty = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const duty = await findDutyByParam(event._id, req.params.dutyId);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    // Optimistic Concurrency Check (Section 9 & Section 11 #11)
    if (req.body.version !== undefined && Number(req.body.version) !== duty.version) {
        return res.status(409).json({
            message: `Stale version (${req.body.version} vs server ${duty.version}). Refresh or review concurrent edit before saving.`,
            currentVersion: duty.version,
            serverDuty: duty
        });
    }

    // Completed record lock check (Section 7)
    if ((duty.status === 'Completed' || duty.isLocked) && !req.body.unlockCorrection) {
        return res.status(423).json({
            message: `Duty ${duty.dutyId} is Completed and locked. Open the Duty Drawer and provide a reason to unlock post-completion correction.`
        });
    }

    const timezone = event.excelConfig?.timezone || 'Asia/Kolkata';
    const defaultLead = Number(event.excelConfig?.departureLeadMinutes) || 120;
    const prevStatus = duty.status;
    const isPreDispatch = ['Scheduled'].includes(prevStatus);

    const editableFields = [
        'guestGroup', 'pax', 'carType', 'serviceType', 'isStation',
        'pickupDate', 'guestPickup', 'flightDate', 'flightTime', 'flightNumber', 'arrivalEta',
        'pickupLeadMinutes', 'manualPickupOverride', 'overrideReason', 'pickupConfirmed',
        'pickupPoint', 'dropLocation', 'disposalPackage', 'disposalHours', 'disposalKm',
        'plannedEndTime', 'actualStartTime', 'actualEndTime', 'actualKm',
        'intercityRoute', 'stopovers', 'vehicle', 'vehicleNumber', 'driver', 'driverName', 'driverPhone',
        'vehicleSource', 'vendorName', 'vendorCost', 'vendorCostApproved', 'dutyAmount',
        'status', 'remarks', 'isLocked'
    ];

    const changesRecorded = [];
    const nextVersion = duty.version + 1;
    let onlyTimingEdited = true;

    editableFields.forEach(field => {
        if (req.body[field] === undefined) return;
        const oldVal = duty[field];
        let newVal = req.body[field];
        if (['pax', 'pickupLeadMinutes', 'disposalHours', 'disposalKm', 'actualKm', 'vendorCost', 'dutyAmount'].includes(field)) {
            newVal = Number(newVal) || 0;
        }
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
            if (!['pickupDate', 'guestPickup', 'flightDate', 'flightTime', 'pickupLeadMinutes'].includes(field)) {
                onlyTimingEdited = false;
            }
            changesRecorded.push({
                company: event.company,
                event: event._id,
                duty: duty._id,
                dutyId: duty.dutyId,
                version: nextVersion,
                changeType: req.body.changeType || 'CellEdit',
                field,
                oldValue: oldVal,
                newValue: newVal,
                reason: req.body.reason || (prevStatus === 'Dispatched' ? 'Post-dispatch authorized update' : 'Live grid update'),
                changedBy: req.user?._id || null,
                changedByName: req.user?.name || 'Admin'
            });
            duty[field] = newVal;
        }
    });

    // If user directly modified guestPickup on a Departure without explicit manualPickupOverride=false, mark manual override
    if (duty.serviceType === 'DEPARTURE') {
        if (req.body.guestPickup !== undefined && req.body.flightTime === undefined && req.body.pickupLeadMinutes === undefined && req.body.manualPickupOverride === undefined) {
            duty.manualPickupOverride = true;
        } else if ((req.body.flightTime !== undefined || req.body.flightDate !== undefined || req.body.pickupLeadMinutes !== undefined || req.body.serviceType === 'DEPARTURE') && !duty.manualPickupOverride && duty.flightTime) {
            const lead = duty.pickupLeadMinutes ?? (duty.isStation ? (Number(event.excelConfig?.stationLeadMinutes) || 60) : defaultLead);
            const calc = calculateDeparturePickup(duty.flightDate || duty.pickupDate, duty.flightTime, lead, timezone);
            duty.pickupDate = calc.pickupDate;
            duty.guestPickup = calc.pickupTime;
            duty.pickupLeadMinutes = lead;
        }
    }

    // Recalculate disposal extra hours / KM if applicable
    if (duty.serviceType === 'DISPOSAL' && (duty.actualEndTime || duty.actualKm > 0)) {
        const rateItem = (event.rateCard || []).find(rc =>
            String(rc.serviceName || '').toUpperCase().includes('DISPOS') &&
            (!rc.vehicleType || rc.vehicleType.toLowerCase() === String(duty.carType || '').toLowerCase())
        ) || null;
        const billing = calculateDisposalBilling(duty, rateItem);
        duty.extraHours = billing.extraHours;
        duty.extraKm = billing.extraKm;
        duty.extraAmount = billing.extraAmount;
    }

    // Auto-lock when marked Completed
    if (duty.status === 'Completed' && !req.body.unlockCorrection) {
        duty.isLocked = true;
    }

    // Keep single-group passenger name aligned if edited inline when guests.length === 1
    if (req.body.guestGroup !== undefined && duty.guests?.length === 1) {
        duty.guests[0].guestGroup = duty.guestGroup;
    }
    if (req.body.pax !== undefined && duty.guests?.length === 1) {
        duty.guests[0].pax = duty.pax;
    }

    duty.version = nextVersion;
    duty.syncStatus = 'Pending';
    await duty.save();

    if (changesRecorded.length > 0) {
        await EventDutyChange.insertMany(changesRecorded);
    }

    // Check vehicle turnaround overlap
    const allActiveDuties = await EventDuty.find({ event: event._id, status: { $ne: 'Cancelled' } }).lean();
    const overlapCheck = duty.vehicleNumber
        ? checkVehicleTurnaroundOverlap(duty.toObject(), allActiveDuties, Number(event.excelConfig?.defaultTurnaroundMinutes) || 30)
        : { conflict: false, overlappingDuties: [] };

    // Outbox Sync to Live DRS & Vendor Book (with pre-dispatch pickupTimeOnly protection)
    const syncedDuty = await syncDutyToModules(duty, event, {
        pickupTimeOnly: isPreDispatch && onlyTimingEdited
    });

    await syncLegacyEventEmbeddedDuties(event._id);

    res.json({
        duty: {
            ...syncedDuty.toObject(),
            turnaroundConflict: overlapCheck.conflict,
            turnaroundMessage: overlapCheck.message || ''
        },
        changesCount: changesRecorded.length,
        turnaroundConflict: overlapCheck
    });
});

// @desc    Get full audit history, guest manifest & source evidence for a single duty
// @route   GET /api/admin/events/:id/duties/:dutyId/history
// @access  Private/Admin
const getDutyHistory = asyncHandler(async (req, res) => {
    const duty = await findDutyByParam(req.params.id, req.params.dutyId);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    const sourceRowIds = (duty.sourceLinks || [])
        .map(sl => sl.sourceRowId)
        .filter(id => mongoose.Types.ObjectId.isValid(id));

    const [changes, sourceRows, outboxEvents] = await Promise.all([
        EventDutyChange.find({ event: req.params.id, $or: [{ duty: duty._id }, { dutyId: duty.dutyId }] }).sort({ createdAt: -1 }).lean(),
        sourceRowIds.length > 0 ? EventImportSourceRow.find({ _id: { $in: sourceRowIds } }).lean() : Promise.resolve([]),
        EventOutboxEvent.find({ event: req.params.id, $or: [{ duty: duty._id }, { dutyId: duty.dutyId }] }).sort({ createdAt: -1 }).limit(30).lean()
    ]);

    res.json({
        duty,
        changes,
        sourceRows,
        outboxEvents
    });
});

// @desc    Assign Own Fleet or Vendor Vehicle with turnaround/overlap verification
// @route   POST /api/admin/events/:id/duties/:dutyId/assign
// @access  Private/Admin
const assignDutyVehicle = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const duty = await findDutyByParam(event._id, req.params.dutyId);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    const {
        vehicleSource = 'Own',
        vehicleId = null,
        vehicleNumber = '',
        driverId = null,
        driverName = '',
        driverPhone = '',
        vendorName = '',
        vendorCost = 0,
        vendorCostApproved = false,
        forceAssign = false
    } = req.body;

    const turnaroundMin = Number(event.excelConfig?.defaultTurnaroundMinutes) || 30;
    const allActiveDuties = await EventDuty.find({ event: event._id, status: { $ne: 'Cancelled' } }).lean();
    const candidateForCheck = { ...duty.toObject(), vehicleNumber };
    const overlapCheck = vehicleNumber
        ? checkVehicleTurnaroundOverlap(candidateForCheck, allActiveDuties, turnaroundMin)
        : { conflict: false, overlappingDuties: [] };

    if (overlapCheck.conflict && !forceAssign) {
        return res.status(409).json({
            conflict: true,
            message: overlapCheck.message,
            overlappingDuties: overlapCheck.overlappingDuties
        });
    }

    const oldSnap = `${duty.vehicleSource}: ${duty.vehicleNumber || 'Unassigned'} (${duty.vendorName || 'Own'})`;

    duty.vehicleSource = vehicleSource;
    duty.vehicle = vehicleSource === 'Own' && vehicleId ? vehicleId : null;
    duty.vehicleNumber = vehicleNumber;
    duty.driver = driverId || null;
    duty.driverName = driverName;
    duty.driverPhone = driverPhone;
    duty.vendorName = vehicleSource === 'Vendor' ? vendorName : '';
    duty.vendorCost = vehicleSource === 'Vendor' ? (Number(vendorCost) || 0) : 0;
    duty.vendorCostApproved = vehicleSource === 'Vendor' ? Boolean(vendorCostApproved) : false;
    duty.version += 1;

    await duty.save();

    await EventDutyChange.create({
        company: event.company,
        event: event._id,
        duty: duty._id,
        dutyId: duty.dutyId,
        version: duty.version,
        changeType: 'AssignVehicle',
        field: 'vehicleAssignment',
        oldValue: oldSnap,
        newValue: `${vehicleSource}: ${vehicleNumber}${vehicleSource === 'Vendor' ? ` (Vendor: ${vendorName}, ₹${vendorCost})` : ''}${forceAssign && overlapCheck.conflict ? ' [Override]' : ''}`,
        reason: forceAssign && overlapCheck.conflict ? `Assigned with turnaround override: ${overlapCheck.message}` : 'Vehicle assignment updated',
        changedBy: req.user?._id || null,
        changedByName: req.user?.name || 'Admin'
    });

    const syncedDuty = await syncDutyToModules(duty, event);
    await syncLegacyEventEmbeddedDuties(event._id);

    res.json({
        duty: syncedDuty,
        overlapCheck
    });
});

// @desc    Merge 2+ selected vehicle duties into one shared car keeping passenger manifest & source evidence
// @route   POST /api/admin/events/:id/duties/merge
// @access  Private/Admin
const mergeDuties = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const { dutyIds = [], carType, remarks } = req.body;
    if (!Array.isArray(dutyIds) || dutyIds.length < 2) {
        return res.status(400).json({ message: 'Select at least 2 vehicle duties to merge.' });
    }

    const dutiesToMerge = await EventDuty.find({
        event: event._id,
        $or: [
            { _id: { $in: dutyIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
            { dutyId: { $in: dutyIds } }
        ]
    }).sort({ dutyId: 1 });

    if (dutiesToMerge.length < 2) {
        return res.status(400).json({ message: 'Matching duties not found for merge.' });
    }

    const primary = dutiesToMerge[0];
    const secondaryList = dutiesToMerge.slice(1);

    const combinedGuests = [...(primary.guests || [])];
    const combinedLinks = [...(primary.sourceLinks || [])];
    let combinedPax = Number(primary.pax) || 0;
    const absorbedIds = [];

    for (const sec of secondaryList) {
        absorbedIds.push(sec.dutyId);
        combinedPax += Number(sec.pax) || 0;
        if (sec.guests && sec.guests.length > 0) {
            combinedGuests.push(...sec.guests);
        } else {
            combinedGuests.push({ guestGroup: sec.guestGroup, pax: Number(sec.pax) || 1 });
        }
        if (sec.sourceLinks && sec.sourceLinks.length > 0) {
            combinedLinks.push(...sec.sourceLinks);
        }

        // Remove linked DRS & outside vehicle of absorbed duty cleanly
        if (sec.drsDutyRef) await DRSDuty.deleteOne({ _id: sec.drsDutyRef });
        await DRSDuty.deleteMany({ eventId: event._id, bookingId: sec.dutyId });
        if (sec.outsideVehicleRef) await Vehicle.deleteOne({ _id: sec.outsideVehicleRef, eventId: event._id, isOutsideCar: true });

        await sec.deleteOne();
    }

    primary.guests = combinedGuests;
    primary.sourceLinks = combinedLinks;
    primary.pax = combinedPax;
    primary.guestGroup = combinedGuests.map(g => g.guestGroup).filter(Boolean).join(' + ');
    if (carType) primary.carType = carType;
    if (remarks !== undefined) primary.remarks = remarks;
    primary.version += 1;
    await primary.save();

    await EventDutyChange.create({
        company: event.company,
        event: event._id,
        duty: primary._id,
        dutyId: primary.dutyId,
        version: primary.version,
        changeType: 'Merge',
        field: 'guests',
        oldValue: `Merged from ${absorbedIds.join(', ')}`,
        newValue: `${primary.guestGroup} (Total ${primary.pax} PAX)`,
        reason: `Operator consolidated ${dutiesToMerge.length} duties into single vehicle ${primary.dutyId}`,
        changedBy: req.user?._id || null,
        changedByName: req.user?.name || 'Admin'
    });

    await syncDutyToModules(primary, event);
    await syncLegacyEventEmbeddedDuties(event._id);

    res.json({
        message: `Merged ${dutiesToMerge.length} duties into ${primary.dutyId}`,
        duty: primary
    });
});

// @desc    Split one vehicle duty into multiple duties
// @route   POST /api/admin/events/:id/duties/:dutyId/split
// @access  Private/Admin
const splitDuty = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const duty = await findDutyByParam(event._id, req.params.dutyId);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    const { splitCount = 2 } = req.body;
    const n = Math.max(2, Math.min(10, Number(splitCount) || 2));
    const totalPax = Number(duty.pax) || 1;
    const basePax = Math.max(1, Math.floor(totalPax / n));
    let rem = Math.max(0, totalPax - basePax * n);

    const firstPax = basePax + (rem > 0 ? 1 : 0);
    if (rem > 0) rem--;

    duty.pax = firstPax;
    duty.guestGroup = `${duty.guestGroup} (Car 1/${n})`;
    duty.version += 1;
    await duty.save();

    let nextSeq = await getNextDutyNumber(event._id);
    const createdSplits = [];

    for (let i = 2; i <= n; i++) {
        const partPax = basePax + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;

        const splitDoc = await EventDuty.create({
            company: event.company,
            event: event._id,
            dutyId: `LK-${String(nextSeq++).padStart(3, '0')}`,
            version: 1,
            guestGroup: `${duty.guestGroup.replace(/\s*\(Car 1\/\d+\)$/, '')} (Car ${i}/${n})`,
            pax: partPax,
            carType: duty.carType,
            serviceType: duty.serviceType,
            isStation: duty.isStation,
            pickupDate: duty.pickupDate,
            guestPickup: duty.guestPickup,
            flightDate: duty.flightDate,
            flightTime: duty.flightTime,
            flightNumber: duty.flightNumber,
            pickupLeadMinutes: duty.pickupLeadMinutes,
            pickupConfirmed: duty.pickupConfirmed,
            pickupPoint: duty.pickupPoint,
            dropLocation: duty.dropLocation,
            disposalHours: duty.disposalHours,
            disposalKm: duty.disposalKm,
            intercityRoute: duty.intercityRoute,
            sourceLinks: duty.sourceLinks || [],
            rawSourceSheet: duty.rawSourceSheet,
            rawSourceRow: duty.rawSourceRow,
            guests: [{ guestGroup: `${duty.guestGroup.replace(/\s*\(Car 1\/\d+\)$/, '')} (Car ${i}/${n})`, pax: partPax }]
        });
        await syncDutyToModules(splitDoc, event);
        createdSplits.push(splitDoc);
    }

    await EventDutyChange.create({
        company: event.company,
        event: event._id,
        duty: duty._id,
        dutyId: duty.dutyId,
        version: duty.version,
        changeType: 'Split',
        field: 'dutySplit',
        oldValue: `${totalPax} PAX in 1 car`,
        newValue: `Split into ${n} cars: ${[duty.dutyId, ...createdSplits.map(s => s.dutyId)].join(', ')}`,
        reason: 'Operator split vehicle allocation',
        changedBy: req.user?._id || null,
        changedByName: req.user?.name || 'Admin'
    });

    await syncDutyToModules(duty, event);
    await syncLegacyEventEmbeddedDuties(event._id);

    res.json({
        message: `Split ${duty.dutyId} into ${n} duties`,
        primary: duty,
        createdSplits
    });
});

// @desc    Explicitly cancel a duty (missing from revision NEVER auto-cancels)
// @route   POST /api/admin/events/:id/duties/:dutyId/cancel
// @access  Private/Admin
const cancelDuty = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const duty = await findDutyByParam(event._id, req.params.dutyId);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    const { reason = 'Explicitly cancelled by operator', vendorCancellationCharge = 0 } = req.body;
    const oldStatus = duty.status;

    duty.status = 'Cancelled';
    duty.cancellationReason = reason;
    duty.vendorCancellationCharge = Number(vendorCancellationCharge) || 0;
    duty.version += 1;
    await duty.save();

    await EventDutyChange.create({
        company: event.company,
        event: event._id,
        duty: duty._id,
        dutyId: duty.dutyId,
        version: duty.version,
        changeType: 'Cancel',
        field: 'status',
        oldValue: oldStatus,
        newValue: 'Cancelled',
        reason,
        changedBy: req.user?._id || null,
        changedByName: req.user?.name || 'Admin'
    });

    const syncedDuty = await syncDutyToModules(duty, event);
    await syncLegacyEventEmbeddedDuties(event._id);

    res.json({ duty: syncedDuty });
});

// @desc    Create linked Return Leg duty (e.g. Jaipur -> Udaipur) for Intercity/Transfer
// @route   POST /api/admin/events/:id/duties/:dutyId/return-leg
// @access  Private/Admin
const createReturnLegDuty = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const duty = await findDutyByParam(event._id, req.params.dutyId);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    const nextSeq = await getNextDutyNumber(event._id);
    const returnDuty = await EventDuty.create({
        company: event.company,
        event: event._id,
        dutyId: `LK-${String(nextSeq).padStart(3, '0')}`,
        version: 1,
        guestGroup: duty.guestGroup,
        pax: duty.pax,
        carType: duty.carType,
        serviceType: duty.serviceType === 'ARRIVAL' ? 'DEPARTURE' : duty.serviceType,
        pickupDate: req.body.pickupDate || duty.pickupDate,
        guestPickup: req.body.guestPickup || '16:00',
        pickupPoint: duty.dropLocation || 'Destination',
        dropLocation: duty.pickupPoint || 'Origin',
        intercityRoute: duty.serviceType === 'INTERCITY' ? `${duty.dropLocation || 'Destination'} -> ${duty.pickupPoint || 'Origin'}` : '',
        linkedReturnDutyId: duty.dutyId,
        vehicleNumber: duty.vehicleNumber,
        vehicleSource: duty.vehicleSource,
        vendorName: duty.vendorName,
        guests: duty.guests || [],
        sourceLinks: duty.sourceLinks || []
    });

    duty.linkedReturnDutyId = returnDuty.dutyId;
    duty.version += 1;
    await duty.save();

    await EventDutyChange.create({
        company: event.company,
        event: event._id,
        duty: returnDuty._id,
        dutyId: returnDuty.dutyId,
        version: 1,
        changeType: 'Created',
        field: 'returnLeg',
        oldValue: duty.dutyId,
        newValue: `${returnDuty.pickupPoint} -> ${returnDuty.dropLocation}`,
        reason: `Linked return leg created from ${duty.dutyId}`,
        changedBy: req.user?._id || null,
        changedByName: req.user?.name || 'Admin'
    });

    await syncDutyToModules(returnDuty, event);
    await syncLegacyEventEmbeddedDuties(event._id);

    res.status(201).json({ returnDuty });
});

// @desc    Update event-level Excel & Timezone Configuration parameters
// @route   PATCH /api/admin/events/:id/excel-config
// @access  Private/Admin
const updateEventExcelConfig = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.excelConfig = {
        ...(event.excelConfig || {}),
        ...(req.body.excelConfig || req.body)
    };
    if (Array.isArray(req.body.reconciliationAlerts)) {
        event.reconciliationAlerts = req.body.reconciliationAlerts;
    }
    await event.save();

    res.json({ excelConfig: event.excelConfig, reconciliationAlerts: event.reconciliationAlerts });
});

// @desc    Retry all failed or pending outbox syncs
// @route   POST /api/admin/events/:id/outbox/retry
// @access  Private/Admin
const retryOutboxSync = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const duties = await EventDuty.find({
        event: event._id,
        $or: [{ syncStatus: 'SyncError' }, { syncStatus: 'Pending' }]
    });

    let synced = 0;
    let failed = 0;
    for (const d of duties) {
        const resDuty = await syncDutyToModules(d, event);
        if (resDuty.syncStatus === 'Synced') synced++;
        else failed++;
    }

    res.json({
        message: `Retried ${duties.length} duty sync(s): ${synced} succeeded, ${failed} failed.`,
        synced,
        failed
    });
});

// @desc    Export 3-sheet operational Excel workbook (Final Sheet + Manifest/Traceability + Audit Log)
// @route   GET /api/admin/events/:id/duties/export
// @access  Private/Admin
const exportEventDutiesWorkbook = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const [duties, changes] = await Promise.all([
        EventDuty.find({ event: event._id }).sort({ pickupDate: 1, guestPickup: 1, dutyId: 1 }).lean(),
        EventDutyChange.find({ event: event._id }).sort({ createdAt: -1 }).limit(500).lean()
    ]);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Final Vehicle-Wise Register
    const sheet1Rows = duties.map(d => ({
        'Duty ID': d.dutyId,
        'Guest / Group': d.guestGroup,
        'PAX': d.pax,
        'Car Type': d.carType,
        'Service Type': d.serviceType,
        'Pickup Date': d.pickupDate,
        'Guest Pickup': d.guestPickup,
        'Flight / Train Date': d.flightDate,
        'Flight / Train Time': d.flightTime,
        'Flight / Train No.': d.flightNumber,
        'Lead (min)': d.pickupLeadMinutes,
        'Pickup / Reporting': d.pickupPoint,
        'Drop / Destination': d.dropLocation,
        'Vehicle Number': d.vehicleNumber,
        'Source': d.vehicleSource,
        'Vendor Name': d.vendorName,
        'Vendor Cost': d.vendorCost,
        'Status': d.status,
        'Sync Status': d.syncStatus,
        'Remarks': d.remarks
    }));
    const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Vehicle Duties');

    // Sheet 2: Guest Manifest & Workbook Source Traceability
    const sheet2Rows = [];
    duties.forEach(d => {
        const guests = d.guests && d.guests.length > 0 ? d.guests : [{ guestGroup: d.guestGroup, pax: d.pax }];
        const sources = (d.sourceLinks || []).map(sl => `${sl.sheetName} Row ${sl.rowNumber}`).join(' | ') || (d.rawSourceSheet ? `${d.rawSourceSheet} Row ${d.rawSourceRow}` : 'Manual');
        guests.forEach(g => {
            sheet2Rows.push({
                'Duty ID': d.dutyId,
                'Guest / Group': g.guestGroup,
                'PAX': g.pax,
                'Party / Side': g.partySide || '',
                'Phone': g.phone || '',
                'Service Type': d.serviceType,
                'Pickup Date': d.pickupDate,
                'Guest Pickup': d.guestPickup,
                'Assigned Vehicle': d.vehicleNumber || 'TBA',
                'Original Workbook Source(s)': sources
            });
        });
    });
    const ws2 = XLSX.utils.json_to_sheet(sheet2Rows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Guest Manifest & Sources');

    // Sheet 3: Audit Change Log
    const sheet3Rows = changes.map(c => ({
        'Timestamp': c.createdAt ? new Date(c.createdAt).toISOString() : '',
        'Duty ID': c.dutyId,
        'Version': c.version,
        'Change Type': c.changeType,
        'Field': c.field,
        'Old Value': c.oldValue !== null && c.oldValue !== undefined ? String(c.oldValue) : '',
        'New Value': c.newValue !== null && c.newValue !== undefined ? String(c.newValue) : '',
        'Reason': c.reason || '',
        'Changed By': c.changedByName || 'Admin'
    }));
    const ws3 = XLSX.utils.json_to_sheet(sheet3Rows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Audit History');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeName = String(event.name || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Live_Event_Excel.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

module.exports = {
    createImportBatch,
    mapImportBatch,
    getImportReconcile,
    saveImportDecisions,
    commitImportBatch,
    getEventDutiesSheet,
    createEventDuty,
    patchEventDuty,
    getDutyHistory,
    assignDutyVehicle,
    mergeDuties,
    splitDuty,
    cancelDuty,
    createReturnLegDuty,
    updateEventExcelConfig,
    retryOutboxSync,
    exportEventDutiesWorkbook
};
