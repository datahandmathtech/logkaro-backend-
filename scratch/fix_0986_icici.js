require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('../src/models/LedgerEntry');
const BankTransaction = require('../src/models/BankTransaction');
const BankAccount = require('../src/models/BankAccount');

const HDFC = '6aaccd40c7ffdc45b0f24890';
const ICICI = '6ad8e179cfaddcce365ff4bf';

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const le = await LedgerEntry.findById('6ad90cb5cfaddcce3660e474');
    le.bankName = 'ICICI Bank';
    le.paymentMode = 'ICICI Bank';
    le.description = 'Payment received for 09/86 (09/86) via ICICI Bank';
    await le.save();

    const bt = await BankTransaction.findById('6ad90cb5cfaddcce3660e477');
    if (String(bt.bankAccount) === HDFC) {
        bt.bankAccount = ICICI;
        bt.bankName = 'ICICI Bank';
        await bt.save();
        await BankAccount.findByIdAndUpdate(HDFC, { $inc: { currentBalance: -11520 } });
        await BankAccount.findByIdAndUpdate(ICICI, { $inc: { currentBalance: 11520 } });
        console.log('Moved 11520 HDFC -> ICICI');
    } else {
        console.log('BT already on', bt.bankAccount);
    }
    await mongoose.disconnect();
})();
