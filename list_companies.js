const mongoose = require('mongoose');

async function listCompanies() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const companies = await db.collection('companies').find({}).toArray();
    for(let c of companies) {
        console.log("Company:", c._id, c.name);
    }
    
    await mongoose.disconnect();
}
listCompanies();
