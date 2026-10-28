const mongoose = require('mongoose');
const URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(URI);
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
    const sampleLeads = await Lead.find({}).limit(10).lean();
    sampleLeads.forEach(l => {
        console.log(`${l.clientCode}: travelStartDate=${typeof l.travelStartDate} (${l.travelStartDate}), travelEndDate=${typeof l.travelEndDate} (${l.travelEndDate})`);
    });
    process.exit(0);
}
run();
