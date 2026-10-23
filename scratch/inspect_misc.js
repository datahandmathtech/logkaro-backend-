require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Vehicle = require('../src/models/Vehicle');
const Invoice = require('../src/models/Invoice');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const vs = await Vehicle.find({ isOutsideCar: true, carNumber: /RJ27TA1234/i }).lean();
    vs.forEach(v => console.log('VEH', v._id, v.carNumber, 'guest:', v.guestName, 'prop:', v.property, 'duty:', v.dutyType));
    const sb = await Booking.find({ clientName: /sonjoy|sanjoy/i }).select('bookingId clientCode clientName bookingStatus').lean();
    console.log('SONJOY', sb);

    const b = await Booking.findOne({ $or: [{ bookingId: '09/23' }, { clientCode: '09/23' }] }).lean();
    console.log('BKG', b?._id, b?.bookingId, b?.clientName, b?.bookingStatus, b?.totalAmount, b?.advancePaid, b?.balanceDue, b?.paymentStatus, 'invGen', b?.invoiceGenerated, 'company', b?.company);
    const invs = await Invoice.find({ $or: [{ booking: b?._id }, { bookingId: '09/23' }] }).lean();
    invs.forEach(i => console.log('INV', i._id, i.invoiceNumber, i.status, i.company, i.invoiceDate, i.totalAmount));
    const cnt = await Invoice.countDocuments({ company: b?.company });
    console.log('company invoices', cnt);
    await mongoose.disconnect();
})();
