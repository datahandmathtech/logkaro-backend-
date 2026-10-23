require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const LedgerEntry = require('../src/models/LedgerEntry');
const BankTransaction = require('../src/models/BankTransaction');
const CashTransaction = require('../src/models/CashTransaction');
const BankAccount = require('../src/models/BankAccount');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const bkgs = await Booking.find({ clientName: /David Proud/i }).lean();
    for (const b of bkgs) {
        console.log('BKG', b._id, b.clientCode, b.bookingId, b.bookingStatus, 'total', b.totalAmount, 'adv', b.advancePaid, 'bal', b.balanceDue, 'fuel', b.guestFuelFilled, b.guestFuelAmount, 'client', b.client, 'bank', b.bankName, b.paymentMode, 'advPayment', b.advancePayment);
        const les = await LedgerEntry.find({ client: b.client }).sort({ date: 1 }).lean();
        les.forEach(e => console.log('  LE', e._id, e.type, e.amount, e.date?.toISOString?.().slice(0, 10), 'bank:', e.bankName, 'mode:', e.paymentMode, 'ref:', e.referenceId, '|', e.description));
        const bts = await BankTransaction.find({ $or: [{ bookingRef: b._id }, { description: new RegExp(b.clientCode || 'zzz') }] }).lean();
        bts.forEach(t => console.log('  BT', t._id, t.type, t.amount, t.date?.toISOString?.().slice(0, 10), 'acct', t.bankAccount, '|', t.description));
        const cts = await CashTransaction.find({ $or: [{ bookingRef: b._id }, { description: new RegExp(b.clientCode || 'zzz') }] }).lean().catch(() => []);
        cts.forEach(t => console.log('  CT', t._id, t.type, t.amount, t.date?.toISOString?.().slice(0, 10), '|', t.description));
    }
    const banks = await BankAccount.find({}).select('bankName accountName company').lean();
    banks.forEach(a => console.log('BANK', a._id, a.bankName, a.accountName, a.company));
    await mongoose.disconnect();
})();
