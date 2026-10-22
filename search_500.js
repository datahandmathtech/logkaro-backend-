const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    const docs = await col.find({
      $or: [
        { amount: 500 },
        { advanceAmount: 500 },
        { advancePaid: 500 }
      ]
    }).toArray();
    for (const d of docs) {
      const dStr = d.date ? d.date.toISOString().split('T')[0] : (d.createdAt ? d.createdAt.toISOString().split('T')[0] : '');
      if (dStr.includes('2026-09-15') || dStr.includes('2026-09-16') || dStr.includes('2026-09-18') || (d.clientName && d.clientName.includes('Ashirit')) || (d.name && d.name.includes('Ashirit'))) {
        console.log(col.collectionName, d._id, d.amount, dStr, d.description || d.clientName || d.bookingId || d.name);
      }
    }
  }
  process.exit(0);
}
run();
