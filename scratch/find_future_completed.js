const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const futureCompleted = await Booking.find({
        bookingStatus: 'Completed',
        $or: [
            { travelEndDate: { $gte: now } },
            { travelEndDate: null, travelStartDate: { $gte: now } }
        ]
    }).lean();

    console.log("Future completed count (travelEndDate >= today):", futureCompleted.length);
    futureCompleted.forEach(b => {
        console.log({
            bookingId: b.bookingId,
            clientCode: b.clientCode,
            clientName: b.clientName,
            status: b.bookingStatus,
            paymentStatus: b.paymentStatus,
            totalAmount: b.totalAmount,
            advancePaid: b.advancePaid,
            balanceDue: b.balanceDue,
            travelStartDate: b.travelStartDate,
            travelEndDate: b.travelEndDate
        });
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
