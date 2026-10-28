const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({}, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
    const v1370 = await Vehicle.findOne({ carNumber: { $regex: '1370' } }).lean();
    console.log('Vehicle 1370:', v1370?._id, v1370?.carNumber);

    if (v1370) {
        const fuels = await Fuel.find({ vehicle: v1370._id }).sort({ date: -1 }).lean();
        console.log('Fuels for 1370:', JSON.stringify(fuels.map(f => ({
            _id: f._id,
            date: f.date,
            amount: f.amount,
            quantity: f.quantity,
            odometer: f.odometer,
            driver: f.driver,
            attendance: f.attendance
        })), null, 2));
    }
    process.exit(0);
}
run();
