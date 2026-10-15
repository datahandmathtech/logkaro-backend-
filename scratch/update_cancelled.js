const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    
    const res1 = await Booking.updateMany(
        { notes: { $regex: /cancelled/i } },
        { $set: { bookingStatus: 'Cancelled' } }
    );
    console.log("Updated cancelled notes to bookingStatus Cancelled:", res1);

    const checkAgain = await Booking.find({
        bookingId: { $in: ['LK-BKG-2026-00027', '09/64', '09/81'] }
    }).select('bookingId clientCode bookingStatus notes').lean();
    console.log("Check after updateMany:", checkAgain);

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
