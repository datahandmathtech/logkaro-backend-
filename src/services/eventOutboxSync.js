const mongoose = require('mongoose');
const DRSDuty = require('../models/DRSDuty');
const Vehicle = require('../models/Vehicle');
const { EventOutboxEvent } = require('../models/EventExcelModels');
const { normalizePlate } = require('./eventExcelEngine');

function mapExcelStatusToDrsStatus(dutyStatus) {
    switch (dutyStatus) {
        case 'Cancelled': return 'Cancelled';
        case 'Completed': return 'Completed';
        case 'Running': return 'Ongoing';
        case 'Dispatched': return 'Started';
        case 'Scheduled':
        default:
            return 'Scheduled';
    }
}

/**
 * Idempotently synchronises a single EventDuty to Live DRS & Vendor Book (OutsideCars)
 * via recorded EventOutboxEvent entries.
 */
async function syncDutyToModules(duty, event, options = {}) {
    const companyId = event.company;
    const isCancelled = duty.status === 'Cancelled';
    const isVendor = duty.vehicleSource === 'Vendor';
    const dutyDateStr = duty.pickupDate
        || (event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : new Date(event.date || Date.now()).toISOString().split('T')[0]);
    const dutyDate = new Date(`${dutyDateStr}T12:00:00Z`);

    const dutyDesc = `[Event: ${event.name}] [${duty.dutyId}] ${duty.serviceType || 'Duty'}: ${duty.pickupPoint || 'Pickup'} -> ${duty.dropLocation || 'Drop'}`;
    const versionKey = `${duty.dutyId}:v${duty.version}:${Date.now()}`;

    const outboxResults = { drs: 'Completed', vendorBook: 'Completed', error: '' };

    // Create Outbox audit entries
    const drsOutbox = await EventOutboxEvent.create({
        company: companyId,
        event: event._id,
        duty: duty._id,
        dutyId: duty.dutyId,
        idempotencyKey: `DRS:${event._id}:${versionKey}`,
        targetModule: 'DRS',
        action: isCancelled ? 'Cancel' : 'Upsert',
        payload: {
            dutyId: duty.dutyId,
            pickupDate: dutyDateStr,
            guestPickup: duty.guestPickup,
            vehicleNumber: duty.vehicleNumber,
            status: duty.status
        },
        status: 'Pending',
        attempts: 1
    });

    const vendorOutbox = await EventOutboxEvent.create({
        company: companyId,
        event: event._id,
        duty: duty._id,
        dutyId: duty.dutyId,
        idempotencyKey: `VENDOR:${event._id}:${versionKey}`,
        targetModule: 'VendorBook',
        action: (!isVendor && duty.outsideVehicleRef) ? 'Delete' : (isCancelled ? 'Cancel' : 'Upsert'),
        payload: {
            dutyId: duty.dutyId,
            vehicleSource: duty.vehicleSource,
            vendorName: duty.vendorName,
            vendorCost: duty.vendorCost,
            pickupTimeOnly: Boolean(options.pickupTimeOnly)
        },
        status: 'Pending',
        attempts: 1
    });

    // 1. VENDOR BOOK (OutsideCars in Vehicle collection)
    try {
        if (!isVendor) {
            // Own fleet vehicle -> ensure NO vendor payable lingers for this Duty ID
            if (duty.outsideVehicleRef) {
                await Vehicle.deleteOne({ _id: duty.outsideVehicleRef, eventId: event._id, isOutsideCar: true });
                duty.outsideVehicleRef = null;
            }
            await Vehicle.deleteMany({ eventId: event._id, isOutsideCar: true, bookingCode: duty.dutyId });
            vendorOutbox.status = 'Completed';
            vendorOutbox.completedAt = new Date();
            await vendorOutbox.save();
        } else {
            // Vendor vehicle -> upsert exactly ONE linked outside-car duty record
            const platePart = normalizePlate(duty.vehicleNumber) || 'VENDOR-TBA';
            const internalCarNum = `${platePart}#${dutyDateStr}#${duty.dutyId}`;

            let existingOutside = duty.outsideVehicleRef
                ? await Vehicle.findById(duty.outsideVehicleRef)
                : await Vehicle.findOne({ eventId: event._id, isOutsideCar: true, bookingCode: duty.dutyId });

            if (isCancelled) {
                if (existingOutside) {
                    existingOutside.remarks = `[CANCELLED] Charge: ₹${Number(duty.vendorCancellationCharge) || 0} | ${duty.cancellationReason || 'Event duty cancelled'} | Duty ${duty.dutyId}`;
                    existingOutside.buyAmount = Number(duty.vendorCancellationCharge) || 0;
                    existingOutside.dutyTime = duty.guestPickup || existingOutside.dutyTime;
                    await existingOutside.save();
                }
            } else {
                const vendorUpdate = {
                    company: companyId,
                    eventId: event._id,
                    isOutsideCar: true,
                    transactionType: 'Buy',
                    vehicleSource: 'External',
                    bookingCode: duty.dutyId,
                    carNumber: internalCarNum,
                    model: duty.carType || 'Crysta',
                    permitType: 'Contract',
                    carType: 'Other',
                    dutyType: duty.serviceType || 'EVENT',
                    dutyTime: duty.guestPickup || '09:00',
                    dutyAmount: Number(duty.dutyAmount) || 0,
                    guestName: duty.guestGroup || event.client || 'Event Guest',
                    guestCount: Number(duty.pax) || 1,
                    property: duty.pickupPoint || event.location || '',
                    dropLocation: duty.dropLocation || '',
                    driverName: duty.driverName || 'NA',
                    ownerName: duty.vendorName || 'External Vendor',
                    remarks: `[Duty ${duty.dutyId}] ${duty.vendorCostApproved ? 'Cost Approved' : 'Cost Pending Approval'} | ${duty.remarks || ''}`.trim(),
                    createdAt: dutyDate
                };

                // Section 8 rule: Pre-dispatch pickup time edits MUST update duty time, NOT silently overwrite agreed vendor buyAmount
                if (!options.pickupTimeOnly || !existingOutside) {
                    vendorUpdate.buyAmount = Number(duty.vendorCost) || 0;
                }

                if (existingOutside) {
                    Object.assign(existingOutside, vendorUpdate);
                    await existingOutside.save();
                    duty.outsideVehicleRef = existingOutside._id;
                } else {
                    const createdOutside = await Vehicle.create(vendorUpdate);
                    duty.outsideVehicleRef = createdOutside._id;
                }
            }

            vendorOutbox.status = 'Completed';
            vendorOutbox.completedAt = new Date();
            await vendorOutbox.save();
        }
    } catch (vErr) {
        outboxResults.vendorBook = 'Failed';
        outboxResults.error = vErr.message;
        vendorOutbox.status = 'Failed';
        vendorOutbox.lastError = vErr.message;
        await vendorOutbox.save();
    }

    // 2. LIVE DRS (DRSDuty collection)
    try {
        let existingDrs = duty.drsDutyRef
            ? await DRSDuty.findById(duty.drsDutyRef)
            : await DRSDuty.findOne({ eventId: event._id, bookingId: duty.dutyId });

        const drsPayload = {
            company: companyId,
            eventId: event._id,
            bookingId: duty.dutyId, // Durable Duty ID (Section 8!)
            clientName: duty.guestGroup || event.client || 'Event Guest',
            hotel: duty.dropLocation || duty.pickupPoint || event.location || '',
            date: dutyDate,
            time: duty.guestPickup || '09:00',
            pickupPoint: duty.pickupPoint || event.location || '',
            duty: dutyDesc,
            carType: duty.carType || 'Crysta',
            vehicle: (!isVendor && duty.vehicle) ? duty.vehicle : null,
            customCarNumber: duty.vehicleNumber || duty.dutyId,
            driver: duty.driver || null,
            customDriverName: duty.driverName || '',
            isOutsideCar: isVendor,
            outsideVehicleRef: duty.outsideVehicleRef || null,
            vendorName: isVendor ? (duty.vendorName || '') : '',
            ownerName: isVendor ? (duty.vendorName || '') : '',
            revenue: Number(duty.dutyAmount) || 0,
            vendorPayout: isVendor ? (isCancelled ? (Number(duty.vendorCancellationCharge) || 0) : (options.pickupTimeOnly && existingDrs ? existingDrs.vendorPayout : Number(duty.vendorCost) || 0)) : 0,
            status: mapExcelStatusToDrsStatus(duty.status),
            isDirectBooking: false,
            guestRemarks: `${duty.pax || 1} PAX${duty.flightNumber ? ` • ${duty.flightNumber}` : ''}${duty.flightTime ? ` • Flight ${duty.flightTime}` : ''}`,
            itinerary: dutyDesc
        };

        if (existingDrs) {
            Object.assign(existingDrs, drsPayload);
            await existingDrs.save();
            duty.drsDutyRef = existingDrs._id;
        } else {
            const createdDrs = await DRSDuty.create(drsPayload);
            duty.drsDutyRef = createdDrs._id;
        }

        drsOutbox.status = 'Completed';
        drsOutbox.completedAt = new Date();
        await drsOutbox.save();
    } catch (dErr) {
        outboxResults.drs = 'Failed';
        outboxResults.error = (outboxResults.error ? outboxResults.error + ' | ' : '') + dErr.message;
        drsOutbox.status = 'Failed';
        drsOutbox.lastError = dErr.message;
        await drsOutbox.save();
    }

    if (outboxResults.drs === 'Failed' || outboxResults.vendorBook === 'Failed') {
        duty.syncStatus = 'SyncError';
        duty.syncError = outboxResults.error;
    } else {
        duty.syncStatus = 'Synced';
        duty.syncError = '';
        duty.lastSyncedAt = new Date();
    }

    await duty.save();
    return duty;
}

/**
 * Keeps legacy event.excelDuties embedded mirror aligned with normalized EventDuty records
 */
async function syncLegacyEventEmbeddedDuties(eventId) {
    const Event = require('../models/Event');
    const { EventDuty } = require('../models/EventExcelModels');
    const duties = await EventDuty.find({ event: eventId }).sort({ pickupDate: 1, guestPickup: 1, dutyId: 1 }).lean();
    await Event.findByIdAndUpdate(eventId, {
        $set: {
            excelDuties: duties.map(d => ({
                dutyId: d.dutyId,
                guestGroup: d.guestGroup,
                pax: d.pax,
                carType: d.carType,
                serviceType: d.serviceType,
                pickupDate: d.pickupDate,
                guestPickup: d.guestPickup,
                flightDate: d.flightDate,
                flightTime: d.flightTime,
                flightNumber: d.flightNumber,
                pickupPoint: d.pickupPoint,
                dropLocation: d.dropLocation,
                vehicleNumber: d.vehicleNumber,
                driverName: d.driverName,
                driverPhone: d.driverPhone,
                vehicleSource: d.vehicleSource,
                vendorName: d.vendorName,
                vendorCost: d.vendorCost,
                dutyAmount: d.dutyAmount,
                status: d.status,
                rawSourceSheet: d.rawSourceSheet,
                rawSourceRow: d.rawSourceRow,
                sourceRef: d.sourceRef,
                disposalHours: d.disposalHours,
                disposalKm: d.disposalKm,
                intercityRoute: d.intercityRoute,
                remarks: d.remarks
            }))
        }
    });
}

module.exports = {
    mapExcelStatusToDrsStatus,
    syncDutyToModules,
    syncLegacyEventEmbeddedDuties
};
