const mongoose = require('mongoose');

async function testApi() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // get a transaction
    const tx = await db.collection('banktransactions').findOne({});
    console.log("Transaction ID:", tx._id.toString());
    
    await mongoose.disconnect();
}
testApi();
