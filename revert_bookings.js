const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = require('./src/models/Booking');
    const bookings = await Booking.find({ bookingStatus: 'Completed' });
    let reverted = 0;
    
    const now = new Date();

    for (let b of bookings) {
        let shouldBeCompleted = false;

        const actualBalance = (b.packagePrice || b.totalAmount || 0) - (b.advancePaid || 0);
        if (actualBalance <= 0 && b.advancePaid > 0) {
            shouldBeCompleted = true;
        }

        const endDate = b.travelEndDate ? new Date(b.travelEndDate) : null;
        if (endDate && !shouldBeCompleted) {
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0,0,0,0);
            if (now >= nextDay) {
                shouldBeCompleted = true;
            }
        }

        if (!shouldBeCompleted) {
            b.bookingStatus = 'Confirmed';
            await b.save();
            reverted++;
        }
    }

    console.log(`Reverted ${reverted} bookings back to Confirmed.`);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
