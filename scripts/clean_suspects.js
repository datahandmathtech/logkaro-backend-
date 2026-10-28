const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

async function cleanSuspects() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));

        // Delete suspect outside cars
        const delRes = await Vehicle.deleteMany({
            _id: { $in: ['6adda1b7b4616787f42e7cc8', '6ada2b74821820fca7e2ad11'] }
        });
        console.log(`Deleted ${delRes.deletedCount} suspect outside vehicle records.`);

        // Fix Booking 09/79
        const fleet0160 = await Vehicle.findOne({ carNumber: 'RJ-27-TB-0160' }).lean();
        if (fleet0160) {
            const b0979 = await Booking.findOne({ $or: [{ bookingCode: /09\/79/i }, { bookingId: /09\/79/i }] });
            if (b0979 && b0979.itinerary) {
                b0979.itinerary = b0979.itinerary.map(it => ({
                    ...it,
                    vehicle: fleet0160._id,
                    vehicleId: fleet0160._id,
                    vehicleNumber: fleet0160.carNumber,
                    isOutsideCar: false,
                    ownerName: '',
                    buyAmount: ''
                }));
                await b0979.save();
                console.log("Updated Booking 09/79 itinerary with fleet vehicle RJ-27-TB-0160");
            }
        }

        // Fix Booking 10/08 if exists
        const fleet9821 = await Vehicle.findOne({ carNumber: 'RJ-27-TA-9821' }).lean();
        if (fleet9821) {
            const b1008 = await Booking.findOne({ $or: [{ bookingCode: /10\/08/i }, { bookingId: /10\/08/i }] });
            if (b1008 && b1008.itinerary) {
                b1008.itinerary = b1008.itinerary.map(it => {
                    const vNum = it.vehicleNumber || '';
                    if (vNum.includes('9821')) {
                        return {
                            ...it,
                            vehicle: fleet9821._id,
                            vehicleId: fleet9821._id,
                            vehicleNumber: fleet9821.carNumber,
                            isOutsideCar: false,
                            ownerName: '',
                            buyAmount: ''
                        };
                    }
                    return it;
                });
                await b1008.save();
                console.log("Updated Booking 10/08 itinerary with fleet vehicle RJ-27-TA-9821");
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanSuspects();
