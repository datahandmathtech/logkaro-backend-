const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const b1 = await Booking.findOne({ bookingId: 'LK-BKG-2026-00027' }).lean();
    const b2 = await Booking.findOne({ $or: [{ bookingId: '09/64' }, { clientCode: '09/64' }] }).lean();

    console.log("b1:", JSON.stringify(b1, null, 2));
    console.log("b2:", JSON.stringify(b2, null, 2));

    process.exit(0);
});
