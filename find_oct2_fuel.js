const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({}, { strict: false }));
    const CashTransaction = mongoose.model('CashTransaction', new mongoose.Schema({}, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

    const octStart = new Date('2026-09-30T18:30:00.000Z');
    const octEnd = new Date('2026-10-31T18:30:00.000Z');

    const fuels = await Fuel.find({ date: { $gte: octStart, $lte: octEnd } }).lean();
    console.log('--- OCTOBER 2026 FUELS count:', fuels.length);
    for (const f of fuels) {
        const v = f.vehicle ? await Vehicle.findById(f.vehicle).lean() : null;
        console.log('Fuel:', f._id, f.date?.toISOString().split('T')[0], '₹' + f.amount, 'car:', v?.carNumber, 'source:', f.paymentSource, 'mode:', f.paymentMode, 'by:', f.paymentBy);
    }

    const cashTxs = await CashTransaction.find({ date: { $gte: octStart, $lte: octEnd } }).sort({ date: 1 }).lean();
    console.log('--- OCTOBER 2026 CASH TXS count:', cashTxs.length);
    for (const c of cashTxs) {
        console.log('CashTx:', c._id, c.date?.toISOString().split('T')[0], c.type, '₹' + c.amount, c.category, c.description);
    }

    await mongoose.disconnect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
