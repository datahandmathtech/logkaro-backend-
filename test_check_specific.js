const mongoose = require('mongoose');
require('dotenv').config();

async function checkSpecificDuties() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));

    const names = ['Kavish', 'Parth', 'Bairagi'];
    for (const name of names) {
        console.log('=== Checking for:', name, '===');
        const leads = await Lead.find({ clientName: new RegExp(name, 'i') });
        console.log('Leads:', leads.map(l => ({
            id: l._id,
            clientName: l.clientName,
            status: l.status,
            startDate: l.startDate,
            endDate: l.endDate,
            travelStartDate: l.travelStartDate,
            travelEndDate: l.travelEndDate,
            itinerary: l.itinerary
        })));

        const bkgs = await Booking.find({ clientName: new RegExp(name, 'i') });
        console.log('Bookings:', bkgs.map(b => ({
            id: b._id,
            bookingId: b.bookingId,
            clientName: b.clientName,
            travelStartDate: b.travelStartDate,
            travelEndDate: b.travelEndDate,
            itinerary: b.itinerary
        })));

        const duties = await DRSDuty.find({ clientName: new RegExp(name, 'i') });
        console.log('DRS Duties:', duties.map(d => ({
            id: d._id,
            clientName: d.clientName,
            bookingId: d.bookingId,
            date: d.date?.toISOString().split('T')[0],
            dayNo: d.dayNo,
            duty: d.duty,
            customCarNumber: d.customCarNumber
        })));
    }

    await mongoose.disconnect();
}
checkSpecificDuties();
