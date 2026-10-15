const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const b8 = await Booking.findOne({ bookingId: 'LK-BKG-2026-00027' }).lean();
    console.log("LK-BKG-2026-00027:", {
        bookingId: b8.bookingId,
        clientCode: b8.clientCode,
        clientName: b8.clientName,
        bookingStatus: b8.bookingStatus,
        travelStartDate: b8.travelStartDate,
        travelEndDate: b8.travelEndDate,
        updatedAt: b8.updatedAt,
        createdAt: b8.createdAt
    });

    // Check all bookings with travelStartDate in the future but bookingStatus = 'Completed'
    const now = new Date();
    const futureCompleted = await Booking.find({
        bookingStatus: 'Completed',
        travelStartDate: { $gt: now }
    }).lean();
    console.log("Future completed count:", futureCompleted.length);
    futureCompleted.forEach(b => {
        console.log(`- ${b.bookingId} (${b.clientCode}): ${b.clientName}, travel: ${b.travelStartDate} to ${b.travelEndDate}`);
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
