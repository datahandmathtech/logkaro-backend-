const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const allBkgs = await Booking.find({}).lean();
    console.log("Total bookings in DB:", allBkgs.length);

    const issues = [];
    allBkgs.forEach(b => {
        const sDate = b.travelStartDate ? new Date(b.travelStartDate) : null;
        const eDate = b.travelEndDate ? new Date(b.travelEndDate) : sDate;
        const isFuture = sDate && sDate > now;
        const isCancelledInNotes = b.notes && b.notes.includes('Cancelled');

        if (b.bookingStatus === 'Completed' && isFuture) {
            issues.push({
                bookingId: b.bookingId,
                clientCode: b.clientCode,
                clientName: b.clientName,
                status: b.bookingStatus,
                isFuture,
                sDate,
                eDate,
                notes: b.notes
            });
        }
    });

    console.log("Completed bookings with FUTURE dates:", issues);
    process.exit(0);
});
