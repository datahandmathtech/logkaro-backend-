const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = require('./src/models/Booking');
    const bookings = await Booking.find({ bookingStatus: 'Confirmed' });
    const now = new Date();
    
    console.log(`Found ${bookings.length} confirmed bookings.`);
    
    for (let b of bookings) {
        let shouldComplete = false;
        const actualBalance = (b.packagePrice || b.totalAmount || 0) - (b.advancePaid || 0);
        
        let reason = '';
        if (actualBalance <= 0 && b.advancePaid > 0) {
            shouldComplete = true;
            reason = `Balance is ${actualBalance}. pkg: ${b.packagePrice}, tot: ${b.totalAmount}, adv: ${b.advancePaid}`;
        }

        const endDate = b.travelEndDate ? new Date(b.travelEndDate) : null;
        if (endDate && !shouldComplete) {
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0,0,0,0);
            if (now >= nextDay) {
                shouldComplete = true;
                reason = `Date passed. End: ${endDate}, Next: ${nextDay}, Now: ${now}`;
            }
        }

        if (shouldComplete) {
            console.log(`Booking ${b._id} will be completed! Reason: ${reason}`);
        }
    }
    process.exit(0);
});
