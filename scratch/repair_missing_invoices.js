require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Invoice = require('../src/models/Invoice');

const APPLY = process.argv.includes('--apply');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const { syncInvoiceForBooking } = require('../src/controllers/invoiceController');
    const bkgs = await Booking.find({ bookingStatus: { $ne: 'Cancelled' } });
    let n = 0;
    for (const b of bkgs) {
        const pkg = Number(b.totalAmount || b.packagePrice) || 0;
        if (pkg <= 0) continue;
        const fuel = b.guestFuelFilled || Number(b.guestFuelAmount) > 0 ? (Number(b.guestFuelAmount) || 0) : 0;
        const eff = Math.max(0, pkg - (Number(b.advancePaid) || 0) - fuel);
        if (eff > 0) continue;
        const or = [{ booking: b._id }];
        if (b.bookingId) or.push({ bookingId: b.bookingId });
        if (b.clientCode) or.push({ bookingId: b.clientCode });
        const inv = await Invoice.findOne({ company: b.company, $or: or }).lean();
        if (inv) continue;
        console.log(`${b.clientCode || b.bookingId} ${b.clientName} status=${b.bookingStatus} pkg=${pkg} adv=${b.advancePaid} fuel=${fuel} storedBal=${b.balanceDue}`);
        n++;
        if (APPLY) {
            b.balanceDue = 0;
            b.paymentStatus = 'Full Received';
            await b.save();
            const created = await syncInvoiceForBooking(b);
            console.log('  -> invoice', created?.invoiceNumber);
        }
    }
    console.log(`${APPLY ? 'Processed' : 'Would process'} ${n}`);
    await mongoose.disconnect();
})();
