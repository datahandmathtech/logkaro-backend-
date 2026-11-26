const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Vehicle = require('../models/Vehicle');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const CashTransaction = require('../models/CashTransaction');
const Company = require('../models/Company');
const mongoose = require('mongoose');

const normalizeRateMatrixPayload = ({ selectedCars, serviceRequirements, rateMatrix, rateCard, existingRateCard = [] }) => {
    const cleanCars = Array.isArray(selectedCars)
        ? selectedCars
            .map(c => (typeof c === 'string' ? { name: c.trim(), subtitle: '' } : { name: String(c?.name || '').trim(), subtitle: String(c?.subtitle || '').trim() }))
            .filter(c => c.name)
        : undefined;

    const cleanServices = Array.isArray(serviceRequirements)
        ? [...new Set(serviceRequirements.map(s => String(s || '').trim()).filter(Boolean))]
        : undefined;

    const cleanMatrix = Array.isArray(rateMatrix)
        ? rateMatrix
            .map(row => {
                const serviceName = String(row?.serviceName || '').trim();
                if (!serviceName) return null;
                const cleanRates = {};
                const rawRates = row?.rates && typeof row.rates === 'object' ? row.rates : {};
                Object.entries(rawRates).forEach(([carKey, val]) => {
                    if (val === '' || val === null || val === undefined) return;
                    const num = Number(val);
                    if (Number.isFinite(num) && num >= 0) {
                        cleanRates[String(carKey).trim()] = num;
                    }
                });
                return { serviceName, rates: cleanRates };
            })
            .filter(Boolean)
        : undefined;

    let finalRateCard = Array.isArray(rateCard) ? rateCard : undefined;
    if (cleanMatrix !== undefined) {
        const carsList = cleanCars || [];
        const derived = [];
        const existingLookup = new Map(
            (existingRateCard || []).map(r => [`${String(r.serviceName || '').trim().toLowerCase()}__${String(r.vehicleType || '').trim().toLowerCase()}`, r])
        );

        cleanMatrix.forEach(row => {
            const entries = carsList.length > 0
                ? carsList.map(c => [c.name, row.rates[c.name], c])
                : Object.entries(row.rates).map(([k, v]) => [k, v, { name: k, subtitle: '' }]);

            entries.forEach(([carName, val, carObj]) => {
                if (val === '' || val === null || val === undefined) return;
                const num = Number(val);
                if (!Number.isFinite(num) || num < 0) return;
                const prev = existingLookup.get(`${row.serviceName.toLowerCase()}__${carName.toLowerCase()}`);
                derived.push({
                    serviceName: row.serviceName,
                    vehicleType: carName,
                    vehicleModel: carObj?.subtitle ? `${carName} (${carObj.subtitle})` : carName,
                    baseRate: num,
                    baseKms: prev?.baseKms || 0,
                    baseHours: prev?.baseHours || 0,
                    extraKmRate: prev?.extraKmRate || 0,
                    extraHourRate: prev?.extraHourRate || 0,
                    driverAllowance: prev?.driverAllowance || 0
                });
            });
        });
        finalRateCard = derived;
    }

    return { cleanCars, cleanServices, cleanMatrix, finalRateCard };
};

// @desc    Create a new event
// @route   POST /api/admin/events
// @access  Private/Admin
const createEvent = asyncHandler(async (req, res) => {
    const {
        name, companyId, client, clientPhone, clientEmail, source, eventType,
        date, startDate, endDate, location, pickupLocation, dropLocation, itinerary, reportingTime,
        description, totalRevenue, advanceAmount, amountReceived, status, proformaAmount,
        vehicleRequirements, customVehicles, selectedCars, serviceRequirements, rateMatrix, rateCard
    } = req.body;

    if (!name || !companyId || (!date && !startDate)) {
        return res.status(400).json({ message: 'Please provide name, companyId and date' });
    }

    const eventDate = date ? new Date(date) : new Date(startDate);
    const evStartDate = startDate ? new Date(startDate) : eventDate;
    const evEndDate = endDate ? new Date(endDate) : evStartDate;

    // Calculate total proforma amount from vehicleRequirements if not provided
    let calcProforma = Number(proformaAmount) || 0;
    if (!calcProforma && Array.isArray(vehicleRequirements) && vehicleRequirements.length > 0) {
        calcProforma = vehicleRequirements.reduce((sum, vr) => sum + (Number(vr.amount) || ((Number(vr.quantity) || 1) * (Number(vr.rate) || 0))), 0);
    }

    const { cleanCars, cleanServices, cleanMatrix, finalRateCard } = normalizeRateMatrixPayload({
        selectedCars, serviceRequirements, rateMatrix, rateCard
    });

    const event = new Event({
        name,
        company: companyId,
        client: client || '',
        clientPhone: clientPhone || '',
        clientEmail: clientEmail || '',
        source: source || 'Direct',
        eventType: eventType || 'Wedding',
        date: eventDate,
        startDate: evStartDate,
        endDate: evEndDate,
        location: location || '',
        pickupLocation: pickupLocation || '',
        dropLocation: dropLocation || '',
        itinerary: itinerary || '',
        reportingTime: reportingTime || '',
        description: description || '',
        totalRevenue: Number(totalRevenue) || 0,
        amountReceived: Number(amountReceived) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        proformaAmount: calcProforma,
        status: status || 'Upcoming',
        vehicleRequirements: Array.isArray(vehicleRequirements) ? vehicleRequirements : [],
        selectedCars: cleanCars || [],
        serviceRequirements: cleanServices || [],
        rateMatrix: cleanMatrix || [],
        rateCard: finalRateCard || [],
        customVehicles: customVehicles || {}
    });

    await event.save();
    res.status(201).json(event);
});

// @desc    Get all events for a company
// @route   GET /api/admin/events/:companyId
// @access  Private/Admin
const getEvents = asyncHandler(async (req, res) => {
    const { from, to, status } = req.query;

    // 🛡️ SECURITY: Prioritize tenantFilter from middleware over URL params for client Admins
    const finalCompanyId = req.tenantFilter?.company || req.params.companyId;
    if (!finalCompanyId || !mongoose.Types.ObjectId.isValid(finalCompanyId)) {
        return res.status(400).json({ message: 'Invalid Co ID' });
    }
    const companyObjectId = new mongoose.Types.ObjectId(finalCompanyId);

    let matchQuery = { company: companyObjectId };
    if (status && status !== 'All') {
        matchQuery.status = status;
    }
    if (from && to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        const fromDate = new Date(from);
        matchQuery.$or = [
            { date: { $gte: fromDate, $lte: toDate } },
            { startDate: { $gte: fromDate, $lte: toDate } },
            { endDate: { $gte: fromDate, $lte: toDate } },
            { startDate: { $lte: toDate }, endDate: { $gte: fromDate } },
            { status: { $in: ['Lead', 'Upcoming', 'Running'] } }
        ];
    }

    // Advanced aggregation to count fleet (Attendance + Manual Fleet) vs external (Market) cars
    const events = await Event.aggregate([
        { $match: matchQuery },
        // Lookup Manual Vehicle Records (Both Fleet and External source)
        {
            $lookup: {
                from: 'vehicles',
                localField: '_id',
                foreignField: 'eventId',
                as: 'manualRecords'
            }
        },
        // Lookup Fleet Cars (Attendance)
        {
            $lookup: {
                from: 'attendances',
                localField: '_id',
                foreignField: 'eventId',
                as: 'attendanceRecords'
            }
        },
        {
            $addFields: {
                // External is ONLY manual records with source 'External'
                externalRecords: {
                    $filter: {
                        input: '$manualRecords',
                        as: 'v',
                        cond: { $ne: [ '$$v.vehicleSource', 'Fleet' ] }
                    }
                },
                // Fleet is Attendance + manual records with source 'Fleet'
                fleetManualRecords: {
                    $filter: {
                        input: '$manualRecords',
                        as: 'v',
                        cond: { $eq: [ '$$v.vehicleSource', 'Fleet' ] }
                    }
                }
            }
        },
        {
            $addFields: {
                externalCount: { $size: '$externalRecords' },
                fleetCount: { $add: [ { $size: '$attendanceRecords' }, { $size: '$fleetManualRecords' } ] },
                // Calculate Total Operational Revenue from ALL manual duty entries (fleet and external)
                totalRevenue: { $sum: '$manualRecords.dutyAmount' }
            }
        },
        { $project: { manualRecords: 0, attendanceRecords: 0, externalRecords: 0, fleetManualRecords: 0 } },
        { $sort: { date: -1 } }
    ]);

    res.json(events);
});

// @desc    Get event details including cars/duties
// @route   GET /api/admin/events/details/:eventId
// @access  Private/Admin
const getEventDetails = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { from, to } = req.query; // Optional time range for duties

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    // 1. Manual Records from Vehicles table
    let vehicleQuery = { eventId };
    if (from && to) {
        vehicleQuery.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }
    const allManualDuties = await Vehicle.find(vehicleQuery).sort({ createdAt: -1 });

    // Separate based on vehicleSource
    const externalDuties = allManualDuties.filter(d => d.vehicleSource !== 'Fleet');
    const manualFleetDuties = allManualDuties.filter(d => d.vehicleSource === 'Fleet');

    // 2. Real Fleet Duties (Attendance table)
    const Attendance = require('../models/Attendance');
    let fleetQuery = { eventId };
    if (from && to) {
        fleetQuery.date = { $gte: from, $lte: to };
    }
    const realAttendanceDuties = await Attendance.find(fleetQuery).populate('vehicle').populate('driver').sort({ date: -1 });

    // Combine manual fleet and real attendance
    const combinedFleetDuties = [
        ...realAttendanceDuties.map(d => ({ ...d.toObject(), isAttendance: true })),
        ...manualFleetDuties.map(d => ({ ...d.toObject(), isAttendance: false }))
    ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const totalRevenue = allManualDuties.reduce((sum, r) => sum + (r.dutyAmount || 0), 0);

    res.json({
        event: {
            ...event.toObject(),
            totalRevenue,
            fleetCount: combinedFleetDuties.length,
            externalCount: externalDuties.length
        },
        externalDuties,
        fleetDuties: combinedFleetDuties
    });
});

// @desc    Update an event
// @route   PUT /api/admin/events/:id
// @access  Private/Admin
const updateEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (event) {
        event.name = req.body.name || event.name;
        event.client = req.body.client !== undefined ? req.body.client : event.client;
        event.clientPhone = req.body.clientPhone !== undefined ? req.body.clientPhone : event.clientPhone;
        event.clientEmail = req.body.clientEmail !== undefined ? req.body.clientEmail : event.clientEmail;
        event.source = req.body.source !== undefined ? req.body.source : event.source;
        event.eventType = req.body.eventType !== undefined ? req.body.eventType : event.eventType;
        if (req.body.date) event.date = new Date(req.body.date);
        if (req.body.startDate) event.startDate = new Date(req.body.startDate);
        if (req.body.endDate) event.endDate = new Date(req.body.endDate);
        if (req.body.location !== undefined) event.location = req.body.location;
        if (req.body.pickupLocation !== undefined) event.pickupLocation = req.body.pickupLocation;
        if (req.body.dropLocation !== undefined) event.dropLocation = req.body.dropLocation;
        if (req.body.itinerary !== undefined) event.itinerary = req.body.itinerary;
        if (req.body.reportingTime !== undefined) event.reportingTime = req.body.reportingTime;
        if (req.body.description !== undefined) event.description = req.body.description;
        if (req.body.status !== undefined) event.status = req.body.status;
        if (req.body.vehicleRequirements !== undefined) event.vehicleRequirements = req.body.vehicleRequirements;

        if (
            req.body.selectedCars !== undefined ||
            req.body.serviceRequirements !== undefined ||
            req.body.rateMatrix !== undefined ||
            req.body.rateCard !== undefined
        ) {
            const { cleanCars, cleanServices, cleanMatrix, finalRateCard } = normalizeRateMatrixPayload({
                selectedCars: req.body.selectedCars !== undefined ? req.body.selectedCars : event.selectedCars,
                serviceRequirements: req.body.serviceRequirements !== undefined ? req.body.serviceRequirements : event.serviceRequirements,
                rateMatrix: req.body.rateMatrix,
                rateCard: req.body.rateCard,
                existingRateCard: event.rateCard
            });
            if (cleanCars !== undefined) event.selectedCars = cleanCars;
            if (cleanServices !== undefined) event.serviceRequirements = cleanServices;
            if (cleanMatrix !== undefined) {
                event.rateMatrix = cleanMatrix;
                event.markModified('rateMatrix');
            }
            if (finalRateCard !== undefined) event.rateCard = finalRateCard;
        }
        
        // New financial fields
        if (req.body.totalRevenue !== undefined) event.totalRevenue = Number(req.body.totalRevenue);
        if (req.body.amountReceived !== undefined) event.amountReceived = Number(req.body.amountReceived);
        if (req.body.advanceAmount !== undefined) event.advanceAmount = Number(req.body.advanceAmount);
        if (req.body.proformaAmount !== undefined) event.proformaAmount = Number(req.body.proformaAmount);
        
        // Custom Vehicles
        if (req.body.customVehicles !== undefined) {
            event.customVehicles = req.body.customVehicles;
        }

        const updatedEvent = await event.save();
        res.json(updatedEvent);
    } else {
        res.status(404).json({ message: 'Event not found' });
    }
});

// @desc    Confirm an event lead with advance payment & bank/cash ledger recording
// @route   POST /api/admin/events/:id/confirm
// @access  Private/Admin
const confirmEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    const { advanceAmount, paymentMode, bankAccountId, paymentReference, paymentDate, remarks } = req.body;
    const advance = Number(advanceAmount) || 0;
    const isCash = (paymentMode && paymentMode.toLowerCase().includes('cash')) || paymentMode === 'Cash';
    const effectivePaymentDate = paymentDate ? new Date(paymentDate) : new Date();

    // Determine upcoming vs running based on event dates
    const evDate = event.startDate || event.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evD = new Date(evDate);
    evD.setHours(0, 0, 0, 0);
    const endD = event.endDate ? new Date(event.endDate) : new Date(evD);
    endD.setHours(23, 59, 59, 999);

    let newStatus = 'Upcoming';
    if (evD <= today && endD >= today) {
        newStatus = 'Running';
    } else if (endD < today) {
        newStatus = 'Closed';
    }

    event.status = newStatus;
    if (advance > 0) {
        event.advanceAmount = (event.advanceAmount || 0) + advance;
        event.amountReceived = (event.amountReceived || 0) + advance;
        event.advanceDate = effectivePaymentDate;
        event.paymentMode = isCash ? 'Cash' : 'Bank';

        if (isCash) {
            try {
                const cashTx = await CashTransaction.create({
                    company: event.company,
                    type: 'IN',
                    amount: advance,
                    category: 'Booking Advance',
                    reference: paymentReference || '',
                    description: `Event Advance Received - ${event.name} (${event.client || ''})`,
                    guestName: event.client || '',
                    sourceId: event._id,
                    sourceType: 'EventAdvance',
                    date: effectivePaymentDate,
                    createdBy: req.user ? req.user._id : null
                });
                event.cashTransactionRef = cashTx._id;
                await Company.findByIdAndUpdate(event.company, {
                    $inc: { cashBalance: advance }
                });
            } catch (cashErr) {
                console.error('Error creating cash transaction for event advance:', cashErr);
            }
        } else {
            try {
                let bank = null;
                if (bankAccountId) {
                    bank = await BankAccount.findById(bankAccountId);
                }
                if (!bank) {
                    bank = await BankAccount.findOne({ company: event.company, isDefault: true })
                        || await BankAccount.findOne({ company: event.company });
                }

                if (bank) {
                    const bankTx = await BankTransaction.create({
                        company: event.company,
                        bankAccount: bank._id,
                        bankName: bank.bankName,
                        type: 'IN',
                        amount: advance,
                        category: 'Booking Advance',
                        paymentMode: paymentMode || 'Bank Transfer / NEFT',
                        reference: paymentReference || '',
                        description: `Event Advance Received - ${event.name} (${event.client || ''})`,
                        sourceId: event._id,
                        sourceType: 'EventAdvance',
                        date: effectivePaymentDate,
                        createdBy: req.user ? req.user._id : null
                    });
                    event.bankAccount = bank._id;
                    event.bankTransactionRef = bankTx._id;
                    bank.currentBalance = (bank.currentBalance || 0) + advance;
                    await bank.save();
                }
            } catch (bankErr) {
                console.error('Error creating bank transaction for event advance:', bankErr);
            }
        }
    }

    await event.save();
    res.json({ message: 'Event confirmed successfully', event });
});

// @desc    Cancel event / move to lost with optional refund
// @route   POST /api/admin/events/:id/cancel
// @access  Private/Admin
const cancelEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    const { reason, refundAmount, refundMode, bankAccountId, paymentReference } = req.body;
    const refund = Number(refundAmount) || 0;
    const isCashRefund = (refundMode && refundMode.toLowerCase().includes('cash')) || refundMode === 'Cash';

    event.status = 'Lost';
    event.lostReason = reason || 'Cancelled by Client';
    event.refundAmount = refund;
    event.refundMode = isCashRefund ? 'Cash' : 'Bank';

    if (refund > 0) {
        if (isCashRefund) {
            try {
                await CashTransaction.create({
                    company: event.company,
                    type: 'OUT',
                    amount: refund,
                    category: 'Refund',
                    reference: paymentReference || '',
                    description: `Event Refund - ${event.name} (${event.client || ''})`,
                    guestName: event.client || '',
                    sourceId: event._id,
                    sourceType: 'EventRefund',
                    date: new Date(),
                    createdBy: req.user ? req.user._id : null
                });
                await Company.findByIdAndUpdate(event.company, {
                    $inc: { cashBalance: -refund }
                });
            } catch (cashRefundErr) {
                console.error('Error recording cash refund for event:', cashRefundErr);
            }
        } else {
            try {
                let bank = null;
                if (bankAccountId) {
                    bank = await BankAccount.findById(bankAccountId);
                }
                if (!bank) {
                    bank = await BankAccount.findOne({ company: event.company, isDefault: true })
                        || await BankAccount.findOne({ company: event.company });
                }

                if (bank) {
                    await BankTransaction.create({
                        company: event.company,
                        bankAccount: bank._id,
                        bankName: bank.bankName || '',
                        type: 'OUT',
                        amount: refund,
                        paymentMode: 'Bank Transfer / NEFT',
                        category: 'Refund',
                        reference: paymentReference || '',
                        description: `Event Refund - ${event.name} (${event.client || ''})`,
                        sourceId: event._id,
                        sourceType: 'EventRefund',
                        date: new Date(),
                        createdBy: req.user ? req.user._id : null
                    });
                    bank.currentBalance = (bank.currentBalance || 0) - refund;
                    await bank.save();
                }
            } catch (bankRefundErr) {
                console.error('Error recording bank refund for event:', bankRefundErr);
            }
        }
        event.advanceAmount = Math.max(0, (event.advanceAmount || 0) - refund);
    }

    await event.save();
    res.json({ message: 'Event marked as Lost / Cancelled', event });
});

// @desc    Cleanup orphaned event vehicles and DRS duties (whose event was deleted)
const cleanupOrphanedEventRecords = async () => {
    try {
        const DRSDuty = require('../models/DRSDuty');
        const validEvents = await Event.find().select('_id name').lean();
        const validEventIdStrs = new Set(validEvents.map(e => e._id.toString()));

        // 1. Find all vehicles with an eventId whose event no longer exists
        const allEventVehicles = await Vehicle.find({
            eventId: { $exists: true, $ne: null }
        }).select('_id eventId carNumber').lean();

        const orphanedVehIds = [];
        for (const v of allEventVehicles) {
            if (!validEventIdStrs.has(v.eventId.toString())) {
                orphanedVehIds.push(v._id);
            }
        }

        let delVehCount = 0;
        if (orphanedVehIds.length > 0) {
            const delVeh = await Vehicle.deleteMany({ _id: { $in: orphanedVehIds } });
            delVehCount = delVeh.deletedCount;
        }

        const validEventVehIds = new Set(
            (await Vehicle.find({ eventId: { $exists: true, $ne: null } }).select('_id').lean()).map(v => v._id.toString())
        );

        // 2. Find all event DRSDuties whose event was deleted or whose linked event vehicle no longer exists
        const allEventDrs = await DRSDuty.find({
            $or: [
                { eventId: { $exists: true, $ne: null } },
                { eventVehicleRef: { $exists: true, $ne: null } },
                { itinerary: { $regex: '^\\[Event:' } }
            ]
        }).select('_id eventId outsideVehicleRef eventVehicleRef itinerary').lean();

        const orphanedDrsIds = [];
        for (const d of allEventDrs) {
            const evStr = d.eventId ? d.eventId.toString() : null;
            const outRefStr = d.outsideVehicleRef ? d.outsideVehicleRef.toString() : null;
            const evRefStr = d.eventVehicleRef ? d.eventVehicleRef.toString() : null;
            const isOrphaned = !evStr || !validEventIdStrs.has(evStr) ||
                (evRefStr && !validEventVehIds.has(evRefStr)) ||
                (evStr && outRefStr && !validEventVehIds.has(outRefStr)) ||
                (outRefStr && orphanedVehIds.some(id => id.toString() === outRefStr)) ||
                (evRefStr && orphanedVehIds.some(id => id.toString() === evRefStr));

            if (isOrphaned) {
                orphanedDrsIds.push(d._id);
            }
        }

        let delDrsCount = 0;
        if (orphanedDrsIds.length > 0) {
            const delDrs = await DRSDuty.deleteMany({ _id: { $in: orphanedDrsIds } });
            delDrsCount = delDrs.deletedCount;
        }

        if (delVehCount > 0 || delDrsCount > 0) {
            console.log(`[ORPHAN CLEANUP] Removed ${delVehCount} orphaned event vehicles and ${delDrsCount} orphaned DRS duties.`);
        }
        return { deletedVehicles: delVehCount, deletedDRSDuties: delDrsCount };
    } catch (err) {
        console.error('[ORPHAN CLEANUP ERROR]', err);
        return { error: err.message };
    }
};

// @desc    Purge orphaned event duties endpoint
// @route   POST /api/admin/events/cleanup-orphaned
// @access  Private/Admin
const purgeOrphanedEventDuties = asyncHandler(async (req, res) => {
    const result = await cleanupOrphanedEventRecords();
    res.json({
        message: 'Orphaned event records cleaned up successfully',
        ...result
    });
});

// @desc    Delete an event
// @route   DELETE /api/admin/events/:id
// @access  Private/Admin
const deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const mongoose = require('mongoose');
    const validId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
    const idList = [id, validId].filter(Boolean);

    const event = await Event.findById(id);
    const escName = event ? event.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // 1. Delete all outside vehicles for this event
    const vehiclesToDelete = await Vehicle.find({
        $or: [
            { eventId: { $in: idList } },
            ...(event ? [{ remarks: { $regex: escName, $options: 'i' } }] : [])
        ]
    }).select('_id');
    const vehicleIds = vehiclesToDelete.map(v => v._id);

    await Vehicle.deleteMany({
        $or: [
            { eventId: { $in: idList } },
            { _id: { $in: vehicleIds } }
        ]
    });

    // 2. Delete all DRSDuties for this event or linked to these vehicles
    const DRSDuty = require('../models/DRSDuty');
    await DRSDuty.deleteMany({
        $or: [
            { eventId: { $in: idList } },
            { outsideVehicleRef: { $in: vehicleIds } },
            { eventVehicleRef: { $in: vehicleIds } },
            ...(event ? [{ itinerary: { $regex: `\\[Event: ${escName}\\]`, $options: 'i' } }] : [])
        ]
    });

    // 3. Remove eventId from Fleet Attendance
    const Attendance = require('../models/Attendance');
    await Attendance.updateMany({ eventId: { $in: idList } }, { $unset: { eventId: "" } });

    if (event) {
        await event.deleteOne();
    }

    // Also run orphan cleanup as safety net
    await cleanupOrphanedEventRecords();

    res.json({ message: 'Event and associated records deleted' });
});

// @desc    Add a rate card to an event
// @route   POST /api/admin/events/:id/ratecard
// @access  Private/Admin
const addRateCard = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const newRate = {
        serviceName: req.body.serviceName,
        vehicleType: req.body.vehicleType || '',
        vehicleModel: req.body.vehicleModel || '',
        baseRate: Number(req.body.baseRate) || 0,
        baseKms: Number(req.body.baseKms) || 0,
        baseHours: Number(req.body.baseHours) || 0,
        extraKmRate: Number(req.body.extraKmRate) || 0,
        extraHourRate: Number(req.body.extraHourRate) || 0,
        driverAllowance: Number(req.body.driverAllowance) || 0
    };

    event.rateCard.push(newRate);
    await event.save();
    res.status(201).json(event);
});

// @desc    Update a rate card in an event
// @route   PUT /api/admin/events/:id/ratecard/:rateId
// @access  Private/Admin
const updateRateCard = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const rate = event.rateCard.id(req.params.rateId);
    if (!rate) return res.status(404).json({ message: 'Rate card not found' });

    if (req.body.serviceName !== undefined) rate.serviceName = req.body.serviceName;
    if (req.body.vehicleType !== undefined) rate.vehicleType = req.body.vehicleType;
    if (req.body.vehicleModel !== undefined) rate.vehicleModel = req.body.vehicleModel;
    if (req.body.baseRate !== undefined) rate.baseRate = Number(req.body.baseRate);
    if (req.body.baseKms !== undefined) rate.baseKms = Number(req.body.baseKms);
    if (req.body.baseHours !== undefined) rate.baseHours = Number(req.body.baseHours);
    if (req.body.extraKmRate !== undefined) rate.extraKmRate = Number(req.body.extraKmRate);
    if (req.body.extraHourRate !== undefined) rate.extraHourRate = Number(req.body.extraHourRate);
    if (req.body.driverAllowance !== undefined) rate.driverAllowance = Number(req.body.driverAllowance);

    await event.save();
    res.json(event);
});

// @desc    Delete a rate card from an event
// @route   DELETE /api/admin/events/:id/ratecard/:rateId
// @access  Private/Admin
const deleteRateCard = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.rateCard.pull(req.params.rateId);
    await event.save();
    res.json(event);
});

// @desc    Bulk import duties for an event from Excel
// @route   POST /api/admin/events/:eventId/bulk-import-duties
// @access  Private/Admin
const bulkImportEventDuties = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { duties } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    if (!Array.isArray(duties) || duties.length === 0) {
        return res.status(400).json({ message: 'No duties provided for import' });
    }

    const finalCompanyId = req.tenantFilter?.company || req.companyId || event.company;
    const DRSDuty = require('../models/DRSDuty');
    const mongoose = require('mongoose');

    const vehicleDocs = [];
    const drsDocs = [];

    for (const d of duties) {
        const vehicleId = new mongoose.Types.ObjectId();
        const dateStr = d.date ? (d.date.includes('T') ? d.date.split('T')[0] : d.date) : (event.date ? event.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const randomKey = Math.random().toString(36).substring(2, 7);
        const basePlate = (d.carNumber && d.carNumber.trim()) ? d.carNumber.trim() : (d.model ? `${d.model.toUpperCase().replace(/[\s/]/g, '')}-EV` : 'EVENT-CAR');
        const internalCarNumber = `${basePlate}#${dateStr}#${randomKey}`;

        let formattedTime = d.dutyTime || d.time || '09:00 AM';
        if (formattedTime && /^\d{1,2}:\d{2}$/.test(formattedTime.trim())) {
            const [hh, mm] = formattedTime.trim().split(':').map(Number);
            const ampm = hh >= 12 ? 'PM' : 'AM';
            const displayH = hh % 12 || 12;
            formattedTime = `${String(displayH).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
        }

        const dutyAmount = Number(d.dutyAmount) || Number(d.fare) || 0;
        const buyAmount = Number(d.buyAmount) || 0;
        const guestName = (d.guestName && d.guestName.trim()) ? d.guestName.trim() : (event.client?.trim() || event.name || 'Event Guest');
        const guestCount = Number(d.guestCount) || Number(d.pax) || 1;
        const pickupPoint = d.property || d.pickupPoint || event.location || '';
        const dropLocation = d.dropLocation || event.location || '';
        const remarks = d.remarks || (d.side ? `[${d.side} Side] ${d.flightTrainNo ? 'Details: ' + d.flightTrainNo : ''}` : (d.flightTrainNo || ''));
        const dutyDate = new Date(`${dateStr}T12:00:00Z`);

        vehicleDocs.push({
            _id: vehicleId,
            company: finalCompanyId,
            eventId: event._id,
            isOutsideCar: true,
            transactionType: 'Buy',
            vehicleSource: d.vehicleSource || 'External',
            carNumber: internalCarNumber,
            model: d.model || 'Sedan',
            permitType: 'Contract',
            carType: 'Other',
            dutyType: d.dutyType || 'Airport Pickup',
            dutyTime: formattedTime,
            dutyAmount: dutyAmount,
            buyAmount: buyAmount,
            guestName: guestName,
            guestCount: guestCount,
            property: pickupPoint,
            dropLocation: dropLocation,
            driverName: d.driverName || 'NA',
            ownerName: d.ownerName || '',
            remarks: remarks,
            createdAt: dutyDate
        });

        const dutyDesc = d.dutyType || remarks || `Event: ${event.name}`;
        drsDocs.push({
            company: finalCompanyId,
            clientName: guestName,
            mobileNumber: d.phone || d.mobileNumber || '',
            hotel: dropLocation || pickupPoint,
            date: dutyDate,
            time: formattedTime,
            pickupPoint: pickupPoint,
            duty: dutyDesc,
            carType: d.model || 'Sedan',
            customCarNumber: basePlate,
            customDriverName: d.driverName || '',
            driver: null,
            vehicle: null,
            isOutsideCar: true,
            outsideVehicleRef: vehicleId,
            eventVehicleRef: vehicleId,
            eventId: event._id,
            vendorName: d.ownerName || '',
            ownerName: d.ownerName || '',
            vendorPayout: buyAmount,
            revenue: dutyAmount,
            status: 'Scheduled',
            isDirectBooking: false,
            itinerary: `[Event: ${event.name}] ${dutyDesc}`
        });
    }

    if (vehicleDocs.length > 0) {
        await Vehicle.insertMany(vehicleDocs, { ordered: false });
        await DRSDuty.insertMany(drsDocs, { ordered: false });
    }

    // Recalculate event totalRevenue from all duties
    const allDuties = await Vehicle.find({ eventId: event._id });
    const totalRev = allDuties.reduce((sum, v) => sum + (v.dutyAmount || 0), 0);
    event.totalRevenue = totalRev;
    await event.save();

    res.status(201).json({
        message: `Successfully imported ${vehicleDocs.length} event duties and synced with Live DRS.`,
        count: vehicleDocs.length,
        duties: vehicleDocs
    });
});

// @desc    Bulk delete duties for an event
// @route   POST /api/admin/events/:eventId/bulk-delete-duties
// @access  Private/Admin
const bulkDeleteEventDuties = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { dutyIds, deleteAll } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    const DRSDuty = require('../models/DRSDuty');
    const escName = event.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let deletedCount = 0;
    if (deleteAll) {
        const eventVehs = await Vehicle.find({ eventId: event._id }).select('_id').lean();
        const vehIds = eventVehs.map(v => v._id);
        const delRes = await Vehicle.deleteMany({ eventId: event._id });
        const Attendance = require('../models/Attendance');
        await Attendance.updateMany({ eventId: event._id }, { $unset: { eventId: '' } });
        await DRSDuty.deleteMany({
            $or: [
                { eventId: event._id },
                ...(vehIds.length > 0 ? [{ outsideVehicleRef: { $in: vehIds } }, { eventVehicleRef: { $in: vehIds } }] : []),
                { itinerary: { $regex: `^\\[Event: ${escName}\\]`, $options: 'i' } }
            ]
        });
        deletedCount = delRes.deletedCount;
    } else if (Array.isArray(dutyIds) && dutyIds.length > 0) {
        const validDutyObjIds = dutyIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));
        const allDutyIds = [...dutyIds, ...validDutyObjIds];
        const delRes = await Vehicle.deleteMany({ _id: { $in: allDutyIds }, eventId: event._id });
        await DRSDuty.deleteMany({
            $or: [
                { outsideVehicleRef: { $in: allDutyIds } },
                { eventVehicleRef: { $in: allDutyIds } }
            ]
        });
        deletedCount = delRes.deletedCount;
    }

    // Recalculate event totalRevenue
    const allDuties = await Vehicle.find({ eventId: event._id });
    event.totalRevenue = allDuties.reduce((sum, v) => sum + (v.dutyAmount || 0), 0);
    await event.save();

    await cleanupOrphanedEventRecords();

    res.json({
        message: `Successfully deleted ${deletedCount} event duties.`,
        deletedCount
    });
});

// @desc    Get Excel Duties & reconciliation state for an event
// @route   GET /api/admin/events/:id/excel-duties
// @access  Private/Admin
const getExcelDuties = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const DRSDuty = require('../models/DRSDuty');
    const drsDutiesCount = await DRSDuty.countDocuments({ eventId: event._id });
    const vendorDutiesCount = (event.excelDuties || []).filter(d => d.vehicleSource === 'Vendor').length;

    // Distinct assigned vehicles
    const distinctVehicles = new Set((event.excelDuties || []).map(d => (d.vehicleNumber || '').trim()).filter(Boolean));

    res.json({
        event: {
            _id: event._id,
            name: event.name,
            client: event.client,
            date: event.date,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location,
            status: event.status
        },
        excelDuties: event.excelDuties || [],
        reconciliationAlerts: event.reconciliationAlerts || [],
        excelConfig: event.excelConfig || {
            departureLeadMinutes: 120,
            defaultTurnaroundMinutes: 30,
            disposalHours: 8,
            disposalKm: 80,
            intercityRouteNotes: '',
            timezone: 'Asia/Kolkata'
        },
        counts: {
            rawRows: event.rawWorkbookRowsCount || (event.excelDuties || []).length,
            uniqueGuestGroups: event.uniqueGuestGroupsCount || (event.excelDuties || []).length,
            vehicleDuties: (event.excelDuties || []).length,
            distinctVehicles: distinctVehicles.size,
            drsDuties: drsDutiesCount,
            vendorDuties: vendorDutiesCount
        }
    });
});

// @desc    Save/Sync Excel Duties to database and Live DRS
// @route   POST /api/admin/events/:id/excel-duties
// @access  Private/Admin
const saveExcelDuties = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const { excelDuties, excelConfig, reconciliationAlerts, rawRowsCount, uniqueGroupsCount } = req.body;

    if (Array.isArray(excelDuties)) {
        event.excelDuties = excelDuties;
    }
    if (excelConfig) {
        event.excelConfig = { ...event.excelConfig, ...excelConfig };
    }
    if (Array.isArray(reconciliationAlerts)) {
        event.reconciliationAlerts = reconciliationAlerts;
    }
    if (rawRowsCount !== undefined) event.rawWorkbookRowsCount = Number(rawRowsCount);
    if (uniqueGroupsCount !== undefined) event.uniqueGuestGroupsCount = Number(uniqueGroupsCount);

    // Sync to Live DRS (DRSDuty)
    const DRSDuty = require('../models/DRSDuty');
    const finalCompanyId = req.tenantFilter?.company || req.companyId || event.company;

    if (Array.isArray(excelDuties) && excelDuties.length > 0) {
        for (const duty of excelDuties) {
            const dutyDateStr = duty.pickupDate || (event.startDate ? event.startDate.toISOString().split('T')[0] : event.date.toISOString().split('T')[0]);
            const dutyDate = new Date(`${dutyDateStr}T12:00:00Z`);
            const dutyDesc = `[Event: ${event.name}] ${duty.serviceType || 'Duty'}: ${duty.pickupPoint || 'Pickup'} ➔ ${duty.dropLocation || 'Drop'}`;

            await DRSDuty.findOneAndUpdate(
                { eventId: event._id, customCarNumber: duty.dutyId || duty.vehicleNumber, date: dutyDate },
                {
                    $set: {
                        company: finalCompanyId,
                        clientName: duty.guestGroup || event.client || 'Guest',
                        hotel: duty.dropLocation || duty.pickupPoint || event.location || '',
                        date: dutyDate,
                        time: duty.guestPickup || '09:00 AM',
                        pickupPoint: duty.pickupPoint || event.location || '',
                        duty: dutyDesc,
                        carType: duty.carType || 'Sedan',
                        customCarNumber: duty.vehicleNumber || duty.dutyId || 'EVENT-CAR',
                        customDriverName: duty.driverName || '',
                        eventId: event._id,
                        status: duty.status || 'Scheduled',
                        isOutsideCar: duty.vehicleSource === 'Vendor',
                        vendorName: duty.vendorName || '',
                        revenue: Number(duty.dutyAmount) || 0,
                        vendorPayout: Number(duty.vendorCost) || 0,
                        itinerary: dutyDesc
                    }
                },
                { upsert: true, new: true }
            );
        }
    }

    await event.save();

    res.json({
        message: 'Live Event Excel saved and synced successfully to DRS & Vendor Book!',
        excelDuties: event.excelDuties,
        excelConfig: event.excelConfig,
        reconciliationAlerts: event.reconciliationAlerts
    });
});

module.exports = {
    createEvent,
    getEvents,
    getEventDetails,
    updateEvent,
    deleteEvent,
    confirmEvent,
    cancelEvent,
    getExcelDuties,
    saveExcelDuties,
    addRateCard,
    updateRateCard,
    deleteRateCard,
    bulkImportEventDuties,
    bulkDeleteEventDuties,
    cleanupOrphanedEventRecords,
    purgeOrphanedEventDuties
};
