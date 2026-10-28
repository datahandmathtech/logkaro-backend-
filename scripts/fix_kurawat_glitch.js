const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

connectDB().then(async () => {
    while (mongoose.connection.readyState !== 1) {
        await new Promise(r => setTimeout(r, 200));
    }
    const Booking = mongoose.connection.collection('bookings');
    const result = await Booking.updateOne(
        { bookingId: '10/29' },
        {
            $set: {
                advancePaid: 5000,
                balanceDue: 0,
                paymentStatus: 'Full Received'
            }
        }
    );
    console.log('Updated Booking 10/29:', result);

    const updated = await Booking.findOne({ bookingId: '10/29' });
    console.log('New state:', {
        bookingId: updated.bookingId,
        clientName: updated.clientName,
        totalAmount: updated.totalAmount,
        advancePaid: updated.advancePaid,
        guestFuelAmount: updated.guestFuelAmount,
        balanceDue: updated.balanceDue,
        paymentStatus: updated.paymentStatus
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
