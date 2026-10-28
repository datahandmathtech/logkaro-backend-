const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

async function inspect0979() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
        const b = await Booking.findOne({ $or: [{ bookingCode: /09\/79/i }, { bookingId: /09\/79/i }] }).lean();
        if (b) {
            console.log("Found booking:", b.bookingCode || b.bookingId);
            console.log("guestName:", b.guestName, "clientName:", b.clientName);
            (b.itinerary || []).forEach((it, i) => {
                console.log(`Day ${i+1} (${it.date}): vehicleId="${it.vehicleId}", vehicleNumber="${it.vehicleNumber}", isOutsideCar=${it.isOutsideCar}, ownerName="${it.ownerName}"`);
            });
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspect0979();
