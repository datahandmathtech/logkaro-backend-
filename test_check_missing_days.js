const mongoose = require('mongoose');
require('dotenv').config();

async function checkMissingDays() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));

    const bkgs = await Booking.find({});
    console.log('=== Checking Bookings with multi-day tours ===');
    for (const b of bkgs) {
        if (!b.travelStartDate) continue;
        const start = new Date(b.travelStartDate);
        const end = b.travelEndDate ? new Date(b.travelEndDate) : start;
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

        const duties = await DRSDuty.find({ $or: [{ bookingRef: b._id }, { bookingId: b.bookingId }] });
        if (duties.length !== diffDays) {
            console.log(`Booking ${b.bookingId} (${b.clientName}): Expected ${diffDays} days (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}), but has ${duties.length} DRS duties.`);
            duties.forEach(d => console.log(`   - Duty on ${d.date?.toISOString().split('T')[0]}: ${d.duty}`));
        }
    }

    await mongoose.disconnect();
}
checkMissingDays();
