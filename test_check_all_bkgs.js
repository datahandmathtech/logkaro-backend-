const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllBookingsAndDuties() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));

    const bkgs = await Booking.find({});
    console.log('Total bookings in DB:', bkgs.length);
    for (const b of bkgs) {
        const duties = await DRSDuty.find({ $or: [{ bookingRef: b._id }, { bookingId: b.bookingId }] });
        console.log({
            bookingId: b.bookingId,
            clientName: b.clientName,
            travelStartDate: b.travelStartDate,
            travelEndDate: b.travelEndDate,
            itineraryLength: b.itinerary?.length || 0,
            drsDutiesCount: duties.length,
            drsDates: duties.map(d => ({ dayNo: d.dayNo, date: d.date?.toISOString().split('T')[0], status: d.status, duty: d.duty, customCarNumber: d.customCarNumber }))
        });
    }

    await mongoose.disconnect();
}
checkAllBookingsAndDuties();
