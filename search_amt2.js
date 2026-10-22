const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    const docs = await col.find({
      $or: [
        { amount: 2860 },
        { amount: '2860' },
        { balance: 2860 },
        { 'payments.amount': 2860 }
      ]
    }).toArray();
    if (docs && docs.length > 0) {
      console.log('Collection:', col.collectionName, docs.map(d => ({ _id: d._id, type: d.type, amount: d.amount, date: d.date, name: d.name || d.guestName || d.clientName })));
    }
  }
  process.exit(0);
}
run();
