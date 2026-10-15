const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const leads = await Lead.find({ clientCode: { $in: ['09/50', '09/53', '09/56', '09/58'] } });
    for(let l of leads) {
        console.log(`\nClientCode: ${l.clientCode}`);
        console.log(`Status: ${l.status}`);
        console.log(`Lead Date: ${l.leadDate}`);
        console.log(`Created At: ${l.createdAt}`);
        console.log(`Updated At: ${l.updatedAt}`);
        console.log(`Advance Date: ${l.advanceDate}`);
        console.log(`Total Amount: ${l.totalAmount}`);
    }
    process.exit(0);
});
