const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Booking = require('./src/models/Booking');
  const LedgerEntry = require('./src/models/LedgerEntry');

  // Fetch booking for Ashirit
  const booking = await Booking.findById('6aacfeb2b5445e479ce160fb');
  console.log('Booking raw:', {
    _id: booking._id,
    bookingId: booking.bookingId,
    rawBookingId: booking.rawBookingId,
    bookingCode: booking.bookingCode,
    client: booking.client,
    clientName: booking.clientName,
    lead: booking.lead,
    advancePaid: booking.advancePaid,
    totalAmount: booking.totalAmount
  });

  const data = await LedgerEntry.find({ client: booking.client }).sort({ date: -1, createdAt: -1 }).lean();
  console.log('All entries in DB for this client:', data.map(d => ({
    _id: d._id,
    type: d.type,
    amount: d.amount,
    date: d.date,
    ref: d.referenceId,
    desc: d.description
  })));

  // Run the EXACT filter in ClientLedgerDrawer.jsx
  const bkgIdStr = String(booking._id || '');
  const leadIdStr = String(typeof booking.lead === 'object' ? (booking.lead?._id || '') : (booking.lead || ''));
  const rawBkgId = String(booking.rawBookingId || booking.bookingId || '');
  const bkgCode = String(booking.bookingCode || booking.bookingId || '');
  const clientCode = String(booking.clientCode || '');

  console.log('Filter params:', { bkgIdStr, leadIdStr, rawBkgId, bkgCode, clientCode });

  const bkgLedger = (data || []).filter(entry => {
      if (entry.type === 'Fuel') return true;
      if (['Payment', 'Advance'].includes(entry.type)) {
          const refStr = entry.referenceId ? String(entry.referenceId) : '';
          if (refStr && (refStr === bkgIdStr || (leadIdStr && refStr === leadIdStr))) return true;
          const desc = entry.description || '';
          if (rawBkgId && desc.includes(rawBkgId)) return true;
          if (bkgCode && desc.includes(bkgCode)) return true;
          if (clientCode && desc.includes(clientCode)) return true;
          if (entry.type === 'Advance' && leadIdStr && refStr === leadIdStr) return true;
          if (entry.type === 'Advance' && booking.clientName && desc.toLowerCase().includes(booking.clientName.toLowerCase())) return true;
      }
      return false;
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  console.log('bkgLedger filtered result:', bkgLedger.map(e => ({ type: e.type, amount: e.amount, desc: e.description })));

  process.exit(0);
}
test();
