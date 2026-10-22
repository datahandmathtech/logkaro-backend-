require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Fuel = require('../src/models/Fuel');
const DRSDuty = require('../src/models/DRSDuty');

const APPLY = process.argv.includes('--apply');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const fuels = await Fuel.find({ paymentSource: { $regex: /guest/i } }).lean();
    const dutyIds = fuels.map(f => f.drsDuty).filter(Boolean);
    const duties = await DRSDuty.find({ _id: { $in: dutyIds } }).select('bookingRef bookingId company').lean();
    const dutyMap = new Map(duties.map(d => [String(d._id), d]));

    const sums = new Map();
    for (const f of fuels) {
        let bkgId = f.booking && mongoose.Types.ObjectId.isValid(f.booking) ? String(f.booking) : null;
        if (!bkgId && f.drsDuty) {
            const d = dutyMap.get(String(f.drsDuty));
            if (d?.bookingRef) bkgId = String(d.bookingRef);
            else if (d?.bookingId) {
                const b = await Booking.findOne({ company: d.company, $or: [{ bookingId: d.bookingId }, { clientCode: d.bookingId }] }).select('_id').lean();
                if (b) bkgId = String(b._id);
            }
        }
        if (!bkgId) continue;
        sums.set(bkgId, (sums.get(bkgId) || 0) + (Number(f.amount) || 0));
    }

    let fixed = 0;
    for (const [bkgId, total] of sums) {
        const b = await Booking.findById(bkgId);
        if (!b) continue;
        const current = Number(b.guestFuelAmount) || 0;
        if (total > current || (!b.guestFuelFilled && total > 0)) {
            const pkg = Number(b.totalAmount || b.packagePrice) || 0;
            const adv = Number(b.advancePaid) || 0;
            const newBal = Math.max(0, pkg - adv - total);
            console.log(`${b.bookingId} ${b.clientName}: guestFuel ${current} -> ${total}, balance ${b.balanceDue} -> ${newBal}`);
            if (APPLY) {
                await Booking.updateOne({ _id: b._id }, { $set: { guestFuelFilled: true, guestFuelAmount: total, balanceDue: newBal } });
            }
            fixed++;
        }
    }
    console.log(`${APPLY ? 'Fixed' : 'Would fix'} ${fixed} bookings`);
    await mongoose.disconnect();
})();
