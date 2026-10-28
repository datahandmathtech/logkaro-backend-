const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

connectDB().then(async () => {
    while (mongoose.connection.readyState !== 1) {
        await new Promise(r => setTimeout(r, 200));
    }
    const Bank = mongoose.connection.collection('banktransactions');
    const txs = await Bank.find({
        $or: [
            { description: /Nandkishor/i },
            { reference: /Nandkishor/i },
            { amount: 1000 }
        ]
    }).toArray();
    console.log('Bank transactions:', JSON.stringify(txs, null, 2));

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
