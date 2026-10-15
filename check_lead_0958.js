const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const BankTransaction = mongoose.model('BankTransaction', new mongoose.Schema({}, { strict: false }));
  const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const lead = await Lead.findOne({ clientCode: '09/58' });
  console.log('Lead 09/58:', lead ? { clientCode: lead.clientCode, status: lead.status, advanceDate: lead.advanceDate, advancePayment: lead.advancePayment } : 'Not found');
  
  const booking = await Booking.findOne({ clientCode: '09/58' });
  console.log('Booking 09/58:', booking ? { bookingId: booking.bookingId, clientCode: booking.clientCode, advanceDate: booking.advanceDate, advancePaid: booking.advancePaid } : 'Not found');

  const txs = await BankTransaction.find({ $or: [{ leadRef: lead?._id }, { bookingRef: booking?._id }] }).sort({ createdAt: -1 });
  console.log('BankTransactions for this booking:', txs.map(t => ({ id: t._id, desc: t.description, amount: t.amount, date: t.date, createdAt: t.createdAt })));
  
  await mongoose.disconnect();
}
check();
