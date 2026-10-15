const mongoose = require('mongoose');

async function fixLeadStatus() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find all leads with status 'Open' and update them to 'New'
    const result = await db.collection('leads').updateMany(
        { status: 'Open' },
        { $set: { status: 'New' } }
    );
    
    console.log("Updated", result.modifiedCount, "leads from 'Open' to 'New'");
    
    await mongoose.disconnect();
}
fixLeadStatus();
