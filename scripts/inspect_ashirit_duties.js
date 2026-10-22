require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const bkg = await db.collection('bookings').findOne({ clientName: /Ashirit/i });
        console.log('ASHIRIT BOOKING:');
        console.log('driverName:', bkg.driverName);
        console.log('vehicleNumber:', bkg.vehicleNumber);
        console.log('itinerary:', JSON.stringify(bkg.itinerary, null, 2));
        console.log('drsDuties:', bkg.drsDuties);

        const duties = await db.collection('drsduties').find({ clientName: /Ashirit/i }).toArray();
        console.log('DRS DUTIES BY CLIENT:', JSON.stringify(duties.map(d => ({
            _id: d._id,
            date: d.date,
            duty: d.duty,
            driverName: d.driverName,
            customDriverName: d.customDriverName,
            driverMobile: d.driverMobile,
            vehicleNumber: d.vehicleNumber,
            customCarNumber: d.customCarNumber,
            bookingRef: d.bookingRef,
            bookingId: d.bookingId
        })), null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
