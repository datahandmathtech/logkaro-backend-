require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const LedgerEntry = require('../src/models/LedgerEntry');
const Fuel = require('../src/models/Fuel');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const bkgs = await Booking.find({ clientName: /Rohit Raj/i }).lean();
    for (const b of bkgs) {
        console.log('BOOKING', b._id, b.bookingId, b.clientCode, b.bookingStatus, 'total', b.totalAmount, 'adv', b.advancePaid, 'bal', b.balanceDue, 'gf', b.guestFuelFilled, b.guestFuelAmount, 'client', b.client);
    }
    const clientIds = [...new Set(bkgs.map(b => String(b.client)).filter(Boolean))];
    const entries = await LedgerEntry.find({ client: { $in: clientIds } }).lean();
    entries.forEach(e => console.log('LEDGER', e._id, e.type, e.amount, e.date, e.referenceId, e.description));
    const fuelIds = entries.filter(e => e.type === 'Fuel').map(e => e.referenceId);
    const fuels = await Fuel.find({ _id: { $in: fuelIds } }).lean();
    fuels.forEach(f => console.log('FUEL', f._id, f.amount, f.paymentSource, f.paymentBy, 'booking', f.booking, 'drs', f.drsDuty, 'client', f.client));
    await mongoose.disconnect();
})();
