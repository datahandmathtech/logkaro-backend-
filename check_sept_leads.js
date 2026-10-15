const mongoose = require('mongoose');

async function checkSeptLeads() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find all leads for company YatreeDestination (698ac8b01587e01651a49443)
    // where date is in September 2026
    
    const leads = await db.collection('leads').find({
        company: new mongoose.Types.ObjectId('698ac8b01587e01651a49443')
    }).toArray();
    
    let septCount = 0;
    for (let l of leads) {
        const d = new Date(l.createdAt);
        // Also check leadDate and travelStartDate logic used in frontend:
        const refDate = l.travelStartDate ? new Date(l.travelStartDate) : (l.leadDate ? new Date(l.leadDate) : d);
        
        if (refDate.getMonth() === 8 && refDate.getFullYear() === 2026) {
            septCount++;
        }
    }
    
    console.log("Total leads:", leads.length);
    console.log("Sept leads (using frontend logic):", septCount);
    
    await mongoose.disconnect();
}
checkSeptLeads();
