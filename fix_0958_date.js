const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function fixExisting() {
  await mongoose.connect(process.env.MONGODB_URI);
  const BankTransaction = mongoose.model('BankTransaction', new mongoose.Schema({}, { strict: false }));
  const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const LedgerEntry = mongoose.model('LedgerEntry', new mongoose.Schema({}, { strict: false }));

  const lead = await Lead.findOne({ clientCode: '09/58' });
  const booking = await Booking.findOne({ clientCode: '09/58' });

  if (lead && lead.advanceDate) {
    console.log('Target advance date:', lead.advanceDate);
    const txUpdate = await BankTransaction.updateMany(
      { $or: [{ leadRef: lead._id }, { bookingRef: booking?._id }] },
      { $set: { date: lead.advanceDate } }
    );
    console.log('BankTransaction updated:', txUpdate);

    const ledgerUpdate = await LedgerEntry.updateMany(
      { referenceId: lead._id, type: 'Advance' },
      { $set: { date: lead.advanceDate } }
    );
    console.log('LedgerEntry updated:', ledgerUpdate);
  }

  await mongoose.disconnect();
}
fixExisting();
