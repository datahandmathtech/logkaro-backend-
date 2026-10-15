const mongoose = require('mongoose');

async function fix() {
    const uri1 = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

    console.log('Checking Main Fleet DB (taxi-fleet cluster 1)');
    await mongoose.connect(uri1);
    const db = mongoose.connection.db;
    
    const bookings = await db.collection('bookings').find({ advancePaid: 5000 }).toArray();
    console.log('Found bookings with 5000 advance:', bookings.length);
    
    for (let b of bookings) {
        console.log('Booking:', b._id, 'Advance:', b.advancePaid);
        const txs = await db.collection('banktransactions').find({ bookingRef: b._id }).toArray();
        console.log('Transactions:', txs.length);
        if (txs.length === 0) {
            console.log('Fixing booking', b._id);
            await db.collection('bookings').updateOne({ _id: b._id }, { $set: { advancePaid: 0 } });
        }
    }
    await mongoose.disconnect();
}
fix();
