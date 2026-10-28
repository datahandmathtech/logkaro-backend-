const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

connectDB().then(async () => {
    while (mongoose.connection.readyState !== 1) {
        await new Promise(r => setTimeout(r, 200));
    }
    const Bank = mongoose.connection.collection('bankledgers');
    const txs = await Bank.find({
        amount: 1000,
        type: 'IN'
    }).toArray();
    console.log('Bank transactions (amount 1000, type IN):', JSON.stringify(txs, null, 2));

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
