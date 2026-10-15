const mongoose = require('mongoose');

async function checkLeads() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const ids = [
        new mongoose.Types.ObjectId('6aa26428b44a1d5fb216b0dd'),
        new mongoose.Types.ObjectId('6aaa5e494efe779e7f25feaa'),
        new mongoose.Types.ObjectId('6aacc81aea16bb875e6ee1bf'),
        new mongoose.Types.ObjectId('6aacffbeb5445e479ce161ad'),
        new mongoose.Types.ObjectId('6aacee2fb5445e479ce14c4c'),
        new mongoose.Types.ObjectId('6aacd787ba4beec59b649878') // Anirudh
    ];
    
    const leads = await db.collection('leads').find({ _id: { $in: ids } }).toArray();
    console.log("Found", leads.length, "leads");
    
    for (let l of leads) {
        console.log("Lead:", l.clientName, "| Status:", l.status, "| Company:", l.company, "| Created:", l.createdAt);
    }
    
    await mongoose.disconnect();
}
checkLeads();
