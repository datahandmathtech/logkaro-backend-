const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const DRS = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));
    const duties = await DRS.find({ clientName: { $regex: 'Malhotra', $options: 'i' } }).lean();
    console.log('Duties for Malhotra:', JSON.stringify(duties.map(d => ({
        _id: d._id,
        date: d.date,
        clientName: d.clientName,
        bookingId: d.bookingId,
        bookingRef: d.bookingRef,
        carNumber: d.carNumber,
        duty: d.duty
    })), null, 2));
    process.exit(0);
}
run();
