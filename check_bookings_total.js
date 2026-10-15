const mongoose = require('mongoose');

async function testBookingsTotal() {
    const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find all bookings for Yatree
    const bookings = await db.collection('bookings').find({
        company: new mongoose.Types.ObjectId('698ac8b01587e01651a49443')
    }).toArray();
    
    // Confirmed bookings only? Bookings.jsx filters:
    // list.filter(b => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Ongoing' || b.status === 'Confirmed' || b.status === 'Ongoing')
    const confirmed = bookings.filter(b => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Ongoing' || b.status === 'Confirmed' || b.status === 'Ongoing');
    
    const packageValue = confirmed.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const receivedAmount = confirmed.reduce((sum, b) => sum + (Number(b.advancePaid) || 0), 0);
    
    console.log("Total Confirmed Bookings:", confirmed.length);
    console.log("Package Value:", packageValue);
    console.log("Received Amount:", receivedAmount);
    
    await mongoose.disconnect();
}
testBookingsTotal();
