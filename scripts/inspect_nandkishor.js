const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

connectDB().then(async () => {
    while (mongoose.connection.readyState !== 1) {
        await new Promise(r => setTimeout(r, 200));
    }
    const Bank = mongoose.connection.collection('bankledgers');
    const txs = await Bank.find({
        $or: [
            { particular: /Nandkishor/i },
            { description: /Nandkishor/i },
            { clientName: /Nandkishor/i }
        ]
    }).toArray();
    console.log('Bank transactions for Nandkishor:', JSON.stringify(txs, null, 2));

    const Bookings = mongoose.connection.collection('bookings');
    const bkgs = await Bookings.find({
        $or: [
            { clientName: /Nandkishor/i }
        ]
    }).toArray();
    console.log('Bookings for Nandkishor:', JSON.stringify(bkgs, null, 2));

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
