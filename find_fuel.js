const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({}, { strict: false }));
    const CashTransaction = mongoose.model('CashTransaction', new mongoose.Schema({}, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

    const v9836 = await Vehicle.findOne({ carNumber: /9836/i });
    console.log('Vehicle 9836:', v9836?._id, v9836?.carNumber);

    const fuels = await Fuel.find({}).lean();
    console.log('Total fuels in DB:', fuels.length);
    fuels.forEach(f => console.log('Fuel:', f._id, f.date, f.amount, f.paymentSource, f.paymentMode, f.paymentBy, f.stationName, f.vehicle));

    const cashTxs = await CashTransaction.find({}).sort({ date: -1 }).lean();
    console.log('Total CashTxs:', cashTxs.length);
    cashTxs.forEach(c => console.log('CashTx:', c._id, c.date, c.type, c.amount, c.category, c.description));

    await mongoose.disconnect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
