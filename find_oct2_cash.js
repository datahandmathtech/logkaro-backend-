const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const CashTransaction = mongoose.model('CashTransaction', new mongoose.Schema({}, { strict: false }));

    const oct2Start = new Date('2026-10-01T18:30:00.000Z');
    const oct2End = new Date('2026-10-02T18:30:00.000Z');

    const txs = await CashTransaction.find({
        date: { $gte: oct2Start, $lte: oct2End }
    }).lean();

    console.log('CashTxs on Oct 2 count:', txs.length);
    txs.forEach(t => console.log(' ->', t._id, t.type, t.amount, t.category, t.description, t.reference));

    await mongoose.disconnect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
