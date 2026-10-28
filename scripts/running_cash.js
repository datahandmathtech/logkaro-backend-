const mongoose = require('mongoose');
require('dotenv').config();
const CashTransaction = require('../src/models/CashTransaction');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const txs = await CashTransaction.find({
    date: { $gte: new Date('2026-10-01'), $lte: new Date('2026-10-31T23:59:59.999Z') }
  }).sort({ date: 1, createdAt: 1 });

  let balance = -36190;
  console.log('Starting Opening Balance:', balance);
  txs.forEach((t, i) => {
    if (t.type === 'IN') balance += t.amount;
    else balance -= t.amount;
    if (new Date(t.date) >= new Date('2026-10-23')) {
      console.log(`${i} | ${t.date.toISOString().split('T')[0]} | ${t.type} | ${t.amount} | bal: ${balance} | ${t.category} | ${t.description}`);
    }
  });
  console.log('Final Closing Balance:', balance);
  process.exit(0);
}
run().catch(console.error);
