const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('../src/models/Booking');
const Lead = require('../src/models/Lead');
const CashTransaction = require('../src/models/CashTransaction');
const BankTransaction = require('../src/models/BankTransaction');
const LedgerEntry = require('../src/models/LedgerEntry');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- CONNECTED ---');

  // 1. Booking 10/98
  const booking = await Booking.findOne({ bookingCode: '10/98' });
  if (booking) {
    console.log('BOOKING 10/98:');
    console.log({
      _id: booking._id,
      bookingCode: booking.bookingCode,
      guestName: booking.guestName,
      packagePrice: booking.packagePrice,
      advanceAmount: booking.advanceAmount,
      advancePaid: booking.advancePaid,
      receivedAmount: booking.receivedAmount,
      balanceAmount: booking.balanceAmount,
      status: booking.status,
      payments: booking.payments,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    });
  } else {
    console.log('Booking 10/98 NOT FOUND');
  }

  // 1b. Check LedgerEntry for 10/98
  const ledgerEntries = await LedgerEntry.find({ bookingId: booking?._id });
  console.log('LEDGER ENTRIES FOR 10/98:', ledgerEntries);

  // 2. Lead 09/38
  const leadInLead = await Lead.findOne({ bookingCode: '09/38' });
  const leadInBooking = await Booking.findOne({ bookingCode: '09/38' });
  console.log('LEAD 09/38 in Lead model:', leadInLead ? {
    _id: leadInLead._id,
    bookingCode: leadInLead.bookingCode,
    name: leadInLead.name,
    customerName: leadInLead.customerName,
    status: leadInLead.status,
    startDate: leadInLead.startDate,
    endDate: leadInLead.endDate,
    tourStartDate: leadInLead.tourStartDate,
    tourEndDate: leadInLead.tourEndDate
  } : 'NOT FOUND');

  console.log('LEAD 09/38 in Booking model:', leadInBooking ? {
    _id: leadInBooking._id,
    bookingCode: leadInBooking.bookingCode,
    guestName: leadInBooking.guestName,
    status: leadInBooking.status,
    startDate: leadInBooking.startDate,
    endDate: leadInBooking.endDate,
    pickupDate: leadInBooking.pickupDate,
    dropDate: leadInBooking.dropDate
  } : 'NOT FOUND');

  // 3. CashTransaction recent
  const cashEntries = await CashTransaction.find().sort({ createdAt: -1 }).limit(10);
  console.log('RECENT CASH TRANSACTIONS:');
  cashEntries.forEach(c => {
    console.log(`${c.date?.toISOString()?.split('T')[0]} | ${c.type} | ${c.amount} | ${c.category} | ${c.description} | ${c.partyName || ''} | created: ${c.createdAt}`);
  });

  // 4. BankTransaction recent
  const bankEntries = await BankTransaction.find().sort({ createdAt: -1 }).limit(10);
  console.log('RECENT BANK TRANSACTIONS:');
  bankEntries.forEach(b => {
    console.log(`${b.date?.toISOString()?.split('T')[0]} | ${b.type} | ${b.amount} | ${b.bankName} | ${b.description} | created: ${b.createdAt}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
