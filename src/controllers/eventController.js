const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');

// @desc    Create a new event
// @route   POST /api/admin/events
// @access  Private/Admin
const createEvent = asyncHandler(async (req, res) => {
    const { name, companyId, client, date, location, description, totalRevenue, advanceAmount, amountReceived, status, proformaAmount } = req.body;

    if (!name || !companyId || !date) {
        return res.status(400).json({ message: 'Please provide name, companyId and date' });
    }

    const event = new Event({
        name,
        company: companyId,
        client,
        date: new Date(date),
        location,
        description,
        totalRevenue: Number(totalRevenue) || 0,
        amountReceived: Number(amountReceived) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        proformaAmount: Number(proformaAmount) || 0,
        status: status || 'Upcoming'
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
    if (from && to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.date = {
            $gte: new Date(from),
            $lte: toDate
        };
    }
    
    if (status && status !== 'All') {
        matchQuery.status = status;
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
        event.client = req.body.client || event.client;
        event.date = req.body.date ? new Date(req.body.date) : event.date;
        event.location = req.body.location || event.location;
        event.description = req.body.description || event.description;
        event.status = req.body.status || event.status;
        
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

module.exports = {
    createEvent,
    getEvents,
    getEventDetails,
    updateEvent,
    deleteEvent,
    addRateCard,
    updateRateCard,
    deleteRateCard,
    bulkImportEventDuties,
    bulkDeleteEventDuties,
    cleanupOrphanedEventRecords,
    purgeOrphanedEventDuties
};
