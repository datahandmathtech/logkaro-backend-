const DRSDuty = require('../models/DRSDuty');
const Event = require('../models/Event');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

const syncEventVehicleToDRS = async (vehicleDoc) => {
    if (!vehicleDoc || !vehicleDoc.eventId) return null;
    try {
        const evId = vehicleDoc.eventId;
        const event = await Event.findById(evId).lean();

        let formattedTime = vehicleDoc.dutyTime || '09:00 AM';
        if (formattedTime && /^\d{1,2}:\d{2}$/.test(formattedTime.trim())) {
            const [hh, mm] = formattedTime.trim().split(':').map(Number);
            const ampm = hh >= 12 ? 'PM' : 'AM';
            const displayH = hh % 12 || 12;
            formattedTime = `${String(displayH).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
        } else if (!formattedTime || formattedTime === 'undefined') {
            formattedTime = '09:00 AM';
        }

        const cleanCar = ((vehicleDoc.carNumber || '').split('#')[0]).trim().toUpperCase();
        const isFleet = vehicleDoc.vehicleSource === 'Fleet';
        let fleetVehicleId = null;
        let driverUserId = null;

        if (isFleet) {
            const cleanNum = cleanCar.replace(/[^0-9]/g, '').slice(-4);
            const fVeh = await Vehicle.findOne({
                company: vehicleDoc.company,
                isOutsideCar: { $ne: true },
                carNumber: { $regex: new RegExp(cleanNum, 'i') }
            }).lean();
            if (fVeh) {
                fleetVehicleId = fVeh._id;
                driverUserId = fVeh.currentDriver || null;
            }
        }

        if (!driverUserId && vehicleDoc.driverName && vehicleDoc.driverName !== 'NA') {
            const dName = vehicleDoc.driverName.trim();
            const dUser = await User.findOne({
                company: vehicleDoc.company,
                role: 'Driver',
                name: { $regex: new RegExp(`^${dName}$`, 'i') }
            }).lean();
            if (dUser) driverUserId = dUser._id;
        }

        // Determine duty date
        let dutyDate = vehicleDoc.createdAt || event?.date || new Date();
        const parts = (vehicleDoc.carNumber || '').split('#');
        if (parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
            dutyDate = new Date(`${parts[1]}T12:00:00Z`);
        }

        const clientNameStr = (vehicleDoc.guestName && vehicleDoc.guestName !== 'NA')
            ? vehicleDoc.guestName.trim()
            : (event?.client?.trim() || event?.name || 'Event Guest');

        const dutyDesc = vehicleDoc.dutyType || vehicleDoc.remarks || (event ? `Event: ${event.name}` : 'Event Duty');
        const hotelLoc = vehicleDoc.dropLocation || vehicleDoc.property || event?.location || '';

        const drsData = {
            company: vehicleDoc.company,
            clientName: clientNameStr,
            mobileNumber: vehicleDoc.mobileNumber || '',
            hotel: hotelLoc,
            date: dutyDate,
            time: formattedTime,
            pickupPoint: vehicleDoc.property || vehicleDoc.dropLocation || '',
            duty: dutyDesc,
            carType: vehicleDoc.model || vehicleDoc.carType || 'Sedan',
            customCarNumber: cleanCar,
            customDriverName: vehicleDoc.driverName || '',
            driver: driverUserId,
            vehicle: fleetVehicleId,
            isOutsideCar: !isFleet,
            outsideVehicleRef: vehicleDoc._id,
            eventVehicleRef: vehicleDoc._id,
            eventId: evId,
            vendorName: vehicleDoc.ownerName || '',
            ownerName: vehicleDoc.ownerName || '',
            vendorPayout: Number(vehicleDoc.buyAmount) || 0,
            revenue: Number(vehicleDoc.dutyAmount) || 0,
            status: 'Scheduled',
            isDirectBooking: false,
            itinerary: `${event ? `[Event: ${event.name}] ` : ''}${dutyDesc}`
        };

        const updated = await DRSDuty.findOneAndUpdate(
            {
                $or: [
                    { outsideVehicleRef: vehicleDoc._id },
                    { eventVehicleRef: vehicleDoc._id }
                ]
            },
            { $set: drsData },
            { upsert: true, new: true }
        );
        return updated;
    } catch (e) {
        console.error('Error syncing event vehicle to DRS:', e);
        return null;
    }
};

const deleteEventVehicleFromDRS = async (vehicleId) => {
    if (!vehicleId) return;
    try {
        await DRSDuty.deleteMany({
            $or: [
                { outsideVehicleRef: vehicleId },
                { eventVehicleRef: vehicleId }
            ]
        });
    } catch (e) {
        console.error('Error deleting event vehicle from DRS:', e);
    }
};

const syncAllCompanyEventDutiesToDRS = async (companyId) => {
    try {
        const query = { eventId: { $exists: true, $ne: null } };
        if (companyId) query.company = companyId;
        const evVehicles = await Vehicle.find(query);
        console.log(`Syncing ${evVehicles.length} event vehicles to DRSDuty...`);
        for (const v of evVehicles) {
            await syncEventVehicleToDRS(v);
        }
        console.log(`Event vehicle DRS sync completed.`);
    } catch (e) {
        console.error('Error syncing all event vehicles to DRS:', e);
    }
};

module.exports = {
    syncEventVehicleToDRS,
    deleteEventVehicleFromDRS,
    syncAllCompanyEventDutiesToDRS
};
