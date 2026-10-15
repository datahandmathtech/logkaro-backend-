const mongoose = require('mongoose');

async function testOrphanLeads() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find all confirmed leads
    const confirmedLeads = await db.collection('leads').find({
        company: new mongoose.Types.ObjectId('698ac8b01587e01651a49443'),
        status: 'Confirmed'
    }).toArray();
    
    // Find all bookings
    const bookings = await db.collection('bookings').find({
        company: new mongoose.Types.ObjectId('698ac8b01587e01651a49443')
    }).toArray();
    
    const bookingLeadIds = bookings.map(b => b.lead?.toString());
    
    const orphans = confirmedLeads.filter(l => !bookingLeadIds.includes(l._id.toString()));
    
    console.log("Total Confirmed Leads:", confirmedLeads.length);
    console.log("Total Bookings with leads:", bookingLeadIds.length);
    console.log("Orphan Confirmed Leads (no booking):", orphans.length);
    for (let o of orphans) {
        console.log(`Orphan: ${o.clientCode} ${o.clientName} - Amt: ${o.totalAmount}`);
    }
    
    await mongoose.disconnect();
}
testOrphanLeads();
