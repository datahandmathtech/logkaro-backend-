const mongoose = require('mongoose');

async function checkBookingStatus() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const bookings = await db.collection('bookings').find({
        company: new mongoose.Types.ObjectId('698ac8b01587e01651a49443')
    }).toArray();
    
    for (let b of bookings) {
        console.log(`Booking ${b._id}: status=${b.status} bookingStatus=${b.bookingStatus}`);
    }
    
    await mongoose.disconnect();
}
checkBookingStatus();
