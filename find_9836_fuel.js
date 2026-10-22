const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({}, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
    const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));

    const v = await Vehicle.findOne({ carNumber: /9836/i });
    console.log('Vehicle 9836 ID:', v?._id);

    // Search fuels for vehicle 9836 or amount 3000 or near 2026-10-02
    const fuels = await Fuel.find({
        $or: [
            { vehicle: v?._id },
            { amount: 3000 },
            { notes: /3000/ }
        ]
    }).sort({ date: -1 }).lean();

    console.log('Matching fuels count:', fuels.length);
    for (const f of fuels.slice(0, 15)) {
        console.log({
            _id: f._id,
            date: f.date?.toISOString().split('T')[0],
            amount: f.amount,
            paymentMode: f.paymentMode,
            paymentSource: f.paymentSource,
            paymentBy: f.paymentBy,
            driver: f.driver,
            notes: f.notes
        });
    }

    // Check DRS duties for Ashirit or 9836 on Oct 2
    const duties = await DRSDuty.find({
        $or: [
            { vehicleNumber: /9836/i },
            { clientName: /ashirit/i }
        ]
    }).lean();
    console.log('Matching duties count:', duties.length);
    duties.forEach(d => console.log('Duty:', d.date, d.clientName, d.vehicleNumber, d.driverName, d.fuelFilled, d.fuelAmount));

    await mongoose.disconnect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
