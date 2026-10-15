const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const specificCodes = ['09/50', '09/53', '09/56'];
    const bookings = await Booking.find({ bookingId: { $in: specificCodes } });
    console.log('\nChecking bookings:');
    let sum = 0;
    for(let b of bookings) {
        console.log(b.bookingId, b.totalFare);
        sum += Number(b.totalFare) || 0;
    }
    console.log('Bookings Sum:', sum);
    process.exit(0);
});
