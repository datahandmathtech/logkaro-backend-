const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const res = await Lead.updateMany(
        {
            status: { $nin: ['Confirmed', 'Completed', 'Converted', 'Lost'] },
            bookingId: { $in: [null, ''] },
            notes: { $not: /Restored from Lost|Reopened to Active/i },
            $or: [
                { status: 'Cancelled' },
                { travelStartDate: { $lt: today } },
                { travelEndDate: { $lte: today } }
            ]
        },
        {
            $set: { status: 'Lost', priority: 'Lost' }
        }
    );
    console.log('Updated past unconfirmed leads to Lost:', res.modifiedCount);
    process.exit(0);
}
run();
