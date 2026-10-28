const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
        date: String,
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
        punchIn: Object,
        punchOut: Object,
        fuel: Object
    }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String }));
    const Driver = mongoose.model('Driver', new mongoose.Schema({ name: String }));
    const Fuel = mongoose.model('Fuel', new mongoose.Schema({
        date: Date,
        amount: Number,
        odometer: Number,
        driver: String,
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }
    }));

    const atts = await Attendance.find({ date: '2026-10-23' }).populate('vehicle').populate('driver').lean();
    console.log('Atts on 23-Oct:', JSON.stringify(atts.map(a => ({
        _id: a._id,
        driver: a.driver?.name,
        vehicle: a.vehicle?.carNumber,
        punchIn: a.punchIn,
        punchOut: a.punchOut,
        fuel: a.fuel
    })), null, 2));

    const fuelsOn23 = await Fuel.find({
        date: {
            $gte: new Date('2026-10-23T00:00:00.000Z'),
            $lte: new Date('2026-10-23T23:59:59.999Z')
        }
    }).populate('vehicle').lean();
    console.log('Fuels on 23-Oct:', JSON.stringify(fuelsOn23.map(f => ({
        _id: f._id,
        amount: f.amount,
        odometer: f.odometer,
        driver: f.driver,
        vehicle: f.vehicle?.carNumber
    })), null, 2));

    process.exit(0);
}
run();
