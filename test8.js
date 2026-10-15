const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const l = await Lead.findOne({ clientCode: '09/56' });
    console.log(JSON.stringify(l, null, 2));
    process.exit(0);
});
