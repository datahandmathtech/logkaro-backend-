const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const DRSDuty = require('../models/DRSDuty');
const Booking = require('../models/Booking');

/**
 * Normalizes a plate number string to uppercase alphanumeric.
 */
function normalizePlate(str) {
    return String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Syncs an Outside Car entry in Vehicle model from a DRSDuty.
 * Updates the existing Vehicle in-place, or creates a new one if none exists.
 * Prevents duplicates when editing in Live DRS or Confirmed Bookings.
 */
async function syncOutsideCarFromDuty(duty, existingBooking = null) {
    if (!duty || !duty.company) return null;

    const effCarNo = (duty.customCarNumber || (duty.vehicle && duty.vehicle.carNumber ? duty.vehicle.carNumber : '') || '').trim().toUpperCase();
    const isCompanyFleetCar = Boolean(duty.vehicle && !duty.isOutsideCar && !duty.vendorName);

    const isOutsideDuty = !isCompanyFleetCar && Boolean(
        duty.isOutsideCar ||
        (duty.vendorName && duty.vendorName.trim()) ||
        (duty.ownerName && duty.ownerName.trim()) ||
        (effCarNo && !duty.vehicle)
    );

    const finalVendor = (duty.vendorName || duty.ownerName || '').trim();
    const finalPayout = Number(duty.vendorPayout !== undefined ? duty.vendorPayout : duty.buyAmount) || 0;

    // Case 1: Duty is NOT an outside car (switched to fleet or unassigned)
    if (!isOutsideDuty) {
        if (duty.outsideVehicleRef) {
            try {
                await Vehicle.deleteOne({ _id: duty.outsideVehicleRef, company: duty.company, isOutsideCar: true });
            } catch (_) {}
            duty.outsideVehicleRef = null;
        } else {
            // Also clean up any vehicle linked by drsRef
            try {
                await Vehicle.deleteMany({ drsRef: duty._id, company: duty.company, isOutsideCar: true });
            } catch (_) {}
        }
        return null;
    }

    // Case 2: It is an outside duty and has a car number or vendor
    const cleanPlate = effCarNo.split('#')[0].trim().toUpperCase() || 'OUTSIDE-CAR';
    let dateStr = '';
    if (duty.date) {
        try {
            dateStr = new Date(duty.date).toISOString().split('T')[0];
        } catch (_) {}
    }

    const bkgCode = duty.bookingId || existingBooking?.clientCode || existingBooking?.bookingId || '';
    const bkgCodePart = String(bkgCode || duty.bookingRef || duty._id).slice(-6);
    const carKey = `${cleanPlate}#${dateStr || 'duty'}#${bkgCodePart}`;

    // Lookup existing Outside Car record with multi-stage priority
    let outVeh = null;

    if (duty.outsideVehicleRef) {
        outVeh = await Vehicle.findOne({ _id: duty.outsideVehicleRef, company: duty.company });
    }

    if (!outVeh && duty._id) {
        outVeh = await Vehicle.findOne({ drsRef: duty._id, company: duty.company, isOutsideCar: true });
    }

    if (!outVeh && duty.bookingRef && duty.dayNo) {
        const query = {
            bookingRef: duty.bookingRef,
            company: duty.company,
            isOutsideCar: true,
            itineraryDayNo: duty.dayNo
        };
        if (duty.carIndex) query.carIndex = duty.carIndex;
        outVeh = await Vehicle.findOne(query);
    }

    if (!outVeh && cleanPlate) {
        // Fallback matching by plate and date / bookingCode
        const matchConditions = [
            { carNumber: carKey },
            { carNumber: { $regex: new RegExp(`^${cleanPlate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#${dateStr || ''}`, 'i') } }
        ];
        if (bkgCode) {
            matchConditions.push({ bookingCode: bkgCode, createdAt: duty.date ? new Date(duty.date) : { $exists: true } });
        }
        outVeh = await Vehicle.findOne({
            company: duty.company,
            isOutsideCar: true,
            $or: matchConditions
        });
    }

    const vehPayload = {
        model: duty.carType || 'Sedan',
        ownerName: finalVendor || outVeh?.ownerName || 'Outside Vendor',
        buyAmount: finalPayout,
        dutyAmount: finalPayout || (outVeh?.dutyAmount || 0),
        revenue: Number(duty.revenue) || 0,
        driverName: (duty.customDriverName || (duty.driver && duty.driver.name ? duty.driver.name : '') || outVeh?.driverName || '').trim(),
        guestName: duty.clientName || '',
        dutyType: duty.duty || duty.itinerary || 'Scheduled Duty',
        dutyTime: duty.time || '09:00 AM',
        property: duty.hotel || duty.pickupPoint || '',
        transactionType: 'Buy',
        vehicleSource: 'External',
        isOutsideCar: true,
        permitType: 'Contract',
        carType: 'Other',
        company: duty.company,
        status: 'active',
        bookingRef: duty.bookingRef || existingBooking?._id || null,
        drsRef: duty._id,
        itineraryDayNo: duty.dayNo || 1,
        carIndex: duty.carIndex || 1,
        bookingCode: bkgCode,
        createdAt: duty.date ? new Date(duty.date) : (outVeh?.createdAt || new Date())
    };

    if (outVeh) {
        // If carNumber plate changed, keep old unique suffix or build new consistent key
        const oldParts = (outVeh.carNumber || '').split('#');
        if (oldParts[0] !== cleanPlate || oldParts[1] !== dateStr) {
            outVeh.carNumber = carKey;
        }
        Object.assign(outVeh, vehPayload);
        await outVeh.save();
    } else {
        vehPayload.carNumber = carKey;
        try {
            outVeh = await Vehicle.create(vehPayload);
        } catch (creatErr) {
            // If duplicate key on carNumber, append random suffix to avoid 11000 collision
            if (creatErr.code === 11000) {
                vehPayload.carNumber = `${carKey}#${Math.random().toString(36).substring(2, 6)}`;
                outVeh = await Vehicle.create(vehPayload);
            } else {
                throw creatErr;
            }
        }
    }

    if (outVeh && String(duty.outsideVehicleRef) !== String(outVeh._id)) {
        duty.outsideVehicleRef = outVeh._id;
        await DRSDuty.updateOne({ _id: duty._id }, { $set: { outsideVehicleRef: outVeh._id } });
    }

    // Proactively clean up any stale duplicate vehicles for this specific duty
    if (outVeh && duty._id) {
        try {
            await Vehicle.deleteMany({
                company: duty.company,
                isOutsideCar: true,
                drsRef: duty._id,
                _id: { $ne: outVeh._id }
            });
        } catch (_) {}
    }

    return outVeh;
}

/**
 * Propagate changes made from Outside Cars page into linked DRSDuty and Booking.
 */
async function syncFromVehicleUpdate(vehicleDoc) {
    if (!vehicleDoc || !vehicleDoc.isOutsideCar) return;

    const cleanPlate = (vehicleDoc.carNumber || '').split('#')[0].trim().toUpperCase();
    const vendorName = (vehicleDoc.ownerName || '').trim();
    const payout = Number(vehicleDoc.buyAmount || vehicleDoc.dutyAmount) || 0;
    const driverName = (vehicleDoc.driverName || '').trim();
    const model = (vehicleDoc.model || '').trim();
    const dutyText = (vehicleDoc.dutyType || '').trim();
    const property = (vehicleDoc.property || '').trim();
    const timeVal = vehicleDoc.dutyTime || '';
    const dateVal = vehicleDoc.createdAt ? new Date(vehicleDoc.createdAt) : null;

    // 1. Find linked DRSDuty
    let linkedDuty = null;
    if (vehicleDoc.drsRef) {
        linkedDuty = await DRSDuty.findOne({ _id: vehicleDoc.drsRef, company: vehicleDoc.company });
    }
    if (!linkedDuty) {
        linkedDuty = await DRSDuty.findOne({ outsideVehicleRef: vehicleDoc._id, company: vehicleDoc.company });
    }
    if (!linkedDuty && vehicleDoc.bookingRef && vehicleDoc.itineraryDayNo) {
        linkedDuty = await DRSDuty.findOne({
            bookingRef: vehicleDoc.bookingRef,
            company: vehicleDoc.company,
            dayNo: vehicleDoc.itineraryDayNo
        });
    }
    if (!linkedDuty && cleanPlate && vehicleDoc.bookingCode) {
        linkedDuty = await DRSDuty.findOne({
            company: vehicleDoc.company,
            bookingId: vehicleDoc.bookingCode,
            $or: [
                { customCarNumber: cleanPlate },
                { customCarNumber: { $regex: new RegExp(`^${cleanPlate}`, 'i') } }
            ]
        });
    }

    if (linkedDuty) {
        linkedDuty.customCarNumber = cleanPlate;
        linkedDuty.vendorName = vendorName;
        linkedDuty.ownerName = vendorName;
        linkedDuty.vendorPayout = payout;
        linkedDuty.buyAmount = payout;
        linkedDuty.isOutsideCar = true;
        linkedDuty.outsideVehicleRef = vehicleDoc._id;
        if (driverName) linkedDuty.customDriverName = driverName;
        if (model) linkedDuty.carType = model;
        if (dutyText) {
            linkedDuty.duty = dutyText;
            linkedDuty.itinerary = dutyText;
        }
        if (property) {
            linkedDuty.hotel = property;
            linkedDuty.pickupPoint = property;
        }
        if (timeVal) linkedDuty.time = timeVal;
        if (dateVal && !isNaN(dateVal.getTime())) linkedDuty.date = dateVal;

        await linkedDuty.save();

        if (String(vehicleDoc.drsRef) !== String(linkedDuty._id)) {
            vehicleDoc.drsRef = linkedDuty._id;
            await Vehicle.updateOne({ _id: vehicleDoc._id }, { $set: { drsRef: linkedDuty._id } });
        }
    }

    // 2. Find linked Booking
    const bookingIdToFind = vehicleDoc.bookingRef || linkedDuty?.bookingRef;
    let linkedBooking = null;

    if (bookingIdToFind) {
        linkedBooking = await Booking.findOne({ _id: bookingIdToFind, company: vehicleDoc.company });
    }
    if (!linkedBooking && vehicleDoc.bookingCode) {
        linkedBooking = await Booking.findOne({
            company: vehicleDoc.company,
            $or: [{ clientCode: vehicleDoc.bookingCode }, { bookingId: vehicleDoc.bookingCode }]
        });
    }

    if (linkedBooking && Array.isArray(linkedBooking.itinerary)) {
        const targetDayNo = vehicleDoc.itineraryDayNo || linkedDuty?.dayNo || 1;
        const targetCarIndex = vehicleDoc.carIndex || linkedDuty?.carIndex || 1;

        let matchedItin = linkedBooking.itinerary.find(it =>
            String(it.outsideVehicleRef) === String(vehicleDoc._id)
        );

        if (!matchedItin) {
            matchedItin = linkedBooking.itinerary.find(it =>
                Number(it.dayNo) === Number(targetDayNo) && Number(it.carIndex || 1) === Number(targetCarIndex)
            );
        }

        if (!matchedItin) {
            matchedItin = linkedBooking.itinerary.find(it => Number(it.dayNo) === Number(targetDayNo));
        }

        if (matchedItin) {
            matchedItin.vehicleNumber = cleanPlate;
            matchedItin.customCarNumber = cleanPlate;
            matchedItin.ownerName = vendorName;
            matchedItin.vendorName = vendorName;
            matchedItin.buyAmount = payout;
            matchedItin.isOutsideCar = true;
            matchedItin.outsideVehicleRef = vehicleDoc._id;
            if (driverName) matchedItin.driverName = driverName;
            if (model) matchedItin.vehicleType = model;
            if (dutyText) {
                matchedItin.duty = dutyText;
                matchedItin.description = dutyText;
            }
            if (property) matchedItin.pickupPoint = property;
            if (dateVal && !isNaN(dateVal.getTime())) matchedItin.date = dateVal;

            linkedBooking.markModified('itinerary');
            await linkedBooking.save();
        }

        if (String(vehicleDoc.bookingRef) !== String(linkedBooking._id)) {
            vehicleDoc.bookingRef = linkedBooking._id;
            vehicleDoc.bookingCode = linkedBooking.clientCode || linkedBooking.bookingId || '';
            await Vehicle.updateOne({ _id: vehicleDoc._id }, {
                $set: { bookingRef: linkedBooking._id, bookingCode: vehicleDoc.bookingCode }
            });
        }
    }
}

/**
 * Propagate deletion of an outside vehicle into linked DRSDuty and Booking.
 */
async function syncFromVehicleDelete(vehicleDoc) {
    if (!vehicleDoc || !vehicleDoc.isOutsideCar) return;

    if (vehicleDoc.drsRef || vehicleDoc._id) {
        try {
            await DRSDuty.updateMany(
                {
                    $or: [
                        { _id: vehicleDoc.drsRef },
                        { outsideVehicleRef: vehicleDoc._id }
                    ]
                },
                {
                    $set: {
                        isOutsideCar: false,
                        vendorName: '',
                        vendorPayout: 0,
                        outsideVehicleRef: null
                    }
                }
            );
        } catch (_) {}
    }

    if (vehicleDoc.bookingRef) {
        try {
            const bkg = await Booking.findById(vehicleDoc.bookingRef);
            if (bkg && Array.isArray(bkg.itinerary)) {
                bkg.itinerary.forEach(it => {
                    if (String(it.outsideVehicleRef) === String(vehicleDoc._id) || (it.dayNo === vehicleDoc.itineraryDayNo && it.isOutsideCar)) {
                        it.isOutsideCar = false;
                        it.ownerName = '';
                        it.vendorName = '';
                        it.buyAmount = 0;
                        it.outsideVehicleRef = null;
                    }
                });
                bkg.markModified('itinerary');
                await bkg.save();
            }
        } catch (_) {}
    }
}

module.exports = {
    normalizePlate,
    syncOutsideCarFromDuty,
    syncFromVehicleUpdate,
    syncFromVehicleDelete
};
