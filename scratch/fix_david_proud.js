require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('../src/models/LedgerEntry');
const BankTransaction = require('../src/models/BankTransaction');
const BankAccount = require('../src/models/BankAccount');
const Booking = require('../src/models/Booking');

const ICICI = '6ad8e179cfaddcce365ff4bf';

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const le = await LedgerEntry.findById('6ac1d4db8e5a7d45a1fb8f85');
    const bkg = await Booking.findById('6ac1d4db8e5a7d45a1fb8f87');
    le.bankName = 'ICICI Bank';
    le.paymentMode = 'ICICI Bank';
    le.referenceId = bkg._id;
    le.description = 'Advance received via ICICI Bank';
    await le.save();
    bkg.bankName = 'ICICI Bank';
    await bkg.save();

    const exists = await BankTransaction.findOne({ sourceId: le._id });
    if (!exists) {
        await BankTransaction.create({
            company: bkg.company,
            bankAccount: ICICI,
            bankName: 'ICICI Bank',
            type: 'IN',
            amount: le.amount,
            category: 'Booking Advance',
            paymentMode: 'UPI / QR Code',
            description: `Advance Received - ${bkg.clientName}`,
            bookingRef: bkg._id,
            clientRef: le.client,
            date: le.date,
            sourceId: le._id,
            sourceType: 'LedgerEntry'
        });
        await BankAccount.findByIdAndUpdate(ICICI, { $inc: { currentBalance: le.amount } });
        console.log('Created ICICI bank entry', le.amount, le.date.toISOString().slice(0, 10));
    } else {
        console.log('Bank entry already exists');
    }
    await mongoose.disconnect();
})();
