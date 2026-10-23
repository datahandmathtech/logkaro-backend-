require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('../src/models/LedgerEntry');
const BankTransaction = require('../src/models/BankTransaction');
const BankAccount = require('../src/models/BankAccount');

const HDFC = '6aaccd40c7ffdc45b0f24890';
const ICICI = '6ad8e179cfaddcce365ff4bf';
const APPLY = process.argv.includes('--apply');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    // All ledger entries where user picked ICICI but HDFC got saved (the bank-select bug)
    const les = await LedgerEntry.find({ paymentMode: /icici/i, bankName: /hdfc/i });
    for (const le of les) {
        const bts = await BankTransaction.find({
            amount: le.amount,
            bankAccount: HDFC,
            $or: [{ sourceId: le._id }, { referenceId: le._id }, { bookingRef: le.referenceId }, { date: { $gte: new Date(le.date.getTime() - 86400000 * 3), $lte: new Date(le.date.getTime() + 86400000 * 3) } }]
        }).lean();
        console.log('LE', le._id, le.type, le.amount, le.date.toISOString().slice(0, 10), le.description, '| candidate BTs:', bts.map(b => `${b._id} ${b.description}`));
        if (APPLY) {
            le.bankName = 'ICICI Bank';
            le.description = le.description.replace(/HDFC/i, 'ICICI Bank');
            await le.save();
            if (bts.length === 1) {
                await BankTransaction.updateOne({ _id: bts[0]._id }, { $set: { bankAccount: ICICI, bankName: 'ICICI Bank' } });
                await BankAccount.findByIdAndUpdate(HDFC, { $inc: { currentBalance: -le.amount } });
                await BankAccount.findByIdAndUpdate(ICICI, { $inc: { currentBalance: le.amount } });
                console.log('  moved BT', bts[0]._id);
            } else {
                console.log('  BT not moved (ambiguous/none)');
            }
        }
    }
    await mongoose.disconnect();
})();
