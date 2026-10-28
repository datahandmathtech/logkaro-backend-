const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({}, { strict: false }));
    const fuels = await Fuel.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log('Recent fuels:', JSON.stringify(fuels.map(f => ({
        _id: f._id,
        date: f.date,
        amount: f.amount,
        quantity: f.quantity,
        odometer: f.odometer,
        driver: f.driver,
        vehicle: f.vehicle
    })), null, 2));
    process.exit(0);
}
run();
