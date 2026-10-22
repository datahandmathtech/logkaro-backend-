const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const CashTransaction = require('./src/models/CashTransaction');
  const BankTransaction = require('./src/models/BankTransaction');
  const LedgerEntry = require('./src/models/LedgerEntry');
  const bkgId = new mongoose.Types.ObjectId('6aacfeb2b5445e479ce160fb');
  const clientId = new mongoose.Types.ObjectId('6aacfeb2b5445e479ce160eb');
  const leadId = new mongoose.Types.ObjectId('6aacfe77b5445e479ce16073');

  console.log('--- Cash Transactions ---');
  const cash = await CashTransaction.find({
    $or: [{ bookingRef: bkgId }, { sourceId: bkgId }, { clientRef: clientId }]
  });
  cash.forEach(c => console.log(c._id, c.type, c.amount, c.date ? c.date.toISOString().split('T')[0] : '', c.description, c.category));

  console.log('--- Bank Transactions ---');
  const bank = await BankTransaction.find({
    $or: [{ bookingRef: bkgId }, { sourceId: bkgId }, { clientRef: clientId }, { leadRef: leadId }]
  });
  bank.forEach(b => console.log(b._id, b.type, b.amount, b.date ? b.date.toISOString().split('T')[0] : '', b.description, b.bankAccount));

  console.log('--- Ledger Entries ---');
  const ledger = await LedgerEntry.find({
    $or: [{ client: clientId }, { referenceId: bkgId }, { referenceId: leadId }]
  });
  ledger.forEach(l => console.log(l._id, l.type, l.amount, l.date ? l.date.toISOString().split('T')[0] : '', l.description, 'Ref:', l.referenceId));

  process.exit(0);
}
run();
