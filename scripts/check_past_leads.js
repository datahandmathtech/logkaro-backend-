const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
    const vikas = await Lead.findOne({ clientName: { $regex: 'Vikas', $options: 'i' } }).lean();
    console.log('Vikas lead:', JSON.stringify({
        _id: vikas?._id,
        clientCode: vikas?.clientCode,
        leadId: vikas?.leadId,
        clientName: vikas?.clientName,
        status: vikas?.status,
        priority: vikas?.priority,
        leadDate: vikas?.leadDate,
        travelStartDate: vikas?.travelStartDate,
        travelEndDate: vikas?.travelEndDate,
        advancePayment: vikas?.advancePayment,
        bookingId: vikas?.bookingId
    }, null, 2));

    // Also check all leads where travelStartDate < today but status is not Lost or priority is not Lost
    const todayStr = '2026-10-26';
    const pastUnconfirmed = await Lead.find({
        status: { $nin: ['Lost', 'Cancelled', 'Confirmed', 'Completed', 'Converted'] },
        priority: { $ne: 'Lost' },
        bookingId: { $in: [null, ''] },
        $or: [
            { travelStartDate: { $lt: new Date('2026-10-26T00:00:00.000Z') } },
            { travelEndDate: { $lt: new Date('2026-10-26T00:00:00.000Z') } }
        ]
    }).lean();
    console.log('Past unconfirmed leads count:', pastUnconfirmed.length);
    pastUnconfirmed.forEach(l => {
        console.log(`- ${l.clientCode || l.leadId}: ${l.clientName}, travelStart: ${l.travelStartDate}, status: ${l.status}, priority: ${l.priority}`);
    });

    process.exit(0);
}
run();
