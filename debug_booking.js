const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Booking = require('./src/models/Booking');
const LedgerEntry = require('./src/models/LedgerEntry');
const BankTransaction = require('./src/models/BankTransaction');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const bkgs = await Booking.find({ totalAmount: 10000, company: '698ac8b01587e01651a49443' });
    console.log('Bookings with 10000:', bkgs.length);
    for (const b of bkgs) {
        console.log('Bkg ID:', b._id, 'Client:', b.clientName, 'ClientRef:', b.client, 'Adv:', b.advancePaid);
        const ledgers = await LedgerEntry.find({ client: b.client });
        console.log('  Ledger count:', ledgers.length);
        ledgers.forEach(l => console.log('    Ledger:', l._id, 'Date:', l.date.toISOString().slice(0,10), 'Type:', l.type, 'Amt:', l.amount, 'refId:', l.referenceId, 'desc:', l.description));
        const btxs = await BankTransaction.find({ bookingRef: b._id });
        console.log('  BankTx count:', btxs.length);
        btxs.forEach(t => console.log('    BankTx:', t._id, 'Date:', t.date.toISOString().slice(0,10), 'Amt:', t.amount, 'Category:', t.category, 'Desc:', t.description));
    }
    await mongoose.disconnect();
})();
