const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to Mongo URI...');
  await mongoose.connect(uri);
  const Client = require('./src/models/Client');
  const LedgerEntry = require('./src/models/LedgerEntry');
  const Booking = require('./src/models/Booking');

  const clients = await Client.find({ name: /Namrata/i });
  console.log('Clients found:', clients.map(c => ({ id: c._id, name: c.name, totalBilled: c.totalBilled, totalPaid: c.totalPaid, balance: c.balance })));

  for (const c of clients) {
    const entries = await LedgerEntry.find({ client: c._id }).sort({ date: 1 });
    console.log('Ledger entries for ' + c.name + ' (' + c._id + '):');
    entries.forEach(e => console.log(' - ' + e.type + ': ₹' + e.amount + ' | Date: ' + (e.date ? e.date.toISOString().split('T')[0] : '') + ' | Desc: ' + e.description + ' | Ref: ' + e.referenceId));
    
    const bookings = await Booking.find({ client: c._id });
    console.log('Bookings for ' + c.name + ':', bookings.map(b => ({ id: b._id, bookingId: b.bookingId, totalAmount: b.totalAmount, advancePayment: b.advancePayment, paymentStatus: b.paymentStatus, balanceAmount: b.balanceAmount })));
  }

  process.exit(0);
}
check();
