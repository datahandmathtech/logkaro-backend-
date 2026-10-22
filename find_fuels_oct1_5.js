const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({}, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

    const oct1 = new Date('2026-09-30T18:30:00.000Z');
    const oct5 = new Date('2026-10-05T18:30:00.000Z');

    const fuels = await Fuel.find({
        date: { $gte: oct1, $lte: oct5 }
    }).sort({ date: 1 }).lean();

    console.log('Fuels between Oct 1 and Oct 5 count:', fuels.length);
    for (const f of fuels) {
        const v = f.vehicle ? await Vehicle.findById(f.vehicle).lean() : null;
        console.log('Fuel:', f._id, f.date?.toISOString().split('T')[0], '₹' + f.amount, v?.carNumber, f.driver, f.paymentSource, f.paymentMode, f.paymentBy);
    }

    await mongoose.disconnect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
