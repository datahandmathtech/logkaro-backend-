const mongoose = require('mongoose');

/**
 * Returns the total of all guest-paid Fuel records linked to a booking
 * (either directly via Fuel.booking or through one of the booking's DRS duties).
 * Fuel entries are the source of truth for "Fuel Paid by Guest" ledger rows,
 * so booking balances must never deduct less than this amount.
 */
const getGuestFuelTotalForBooking = async (booking) => {
    try {
        if (!booking || !booking._id) return 0;
        const Fuel = require('../models/Fuel');
        const DRSDuty = require('../models/DRSDuty');

        const dutyOr = [{ bookingRef: booking._id }];
        if (booking.bookingId) dutyOr.push({ bookingId: booking.bookingId });
        if (booking.clientCode) dutyOr.push({ bookingId: booking.clientCode });
        const duties = await DRSDuty.find({ company: booking.company, $or: dutyOr }).select('_id').lean();
        const dutyIds = duties.map(d => d._id);

        const fuelOr = [{ booking: booking._id }];
        if (dutyIds.length) fuelOr.push({ drsDuty: { $in: dutyIds } });

        const agg = await Fuel.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(String(booking.company?._id || booking.company)),
                    paymentSource: { $regex: /guest/i },
                    $or: fuelOr
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return Number(agg[0]?.total) || 0;
    } catch (err) {
        console.error('[getGuestFuelTotalForBooking] Error:', err);
        return 0;
    }
};

/**
 * Ensures booking.guestFuelAmount is at least the sum of guest Fuel records,
 * then recomputes balanceDue. Mutates the booking document (does not save).
 */
const applyGuestFuelFloor = async (booking) => {
    const fuelTotal = await getGuestFuelTotalForBooking(booking);
    const current = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;
    if (fuelTotal > current) {
        booking.guestFuelFilled = true;
        booking.guestFuelAmount = fuelTotal;
    }
    const fuelDed = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;
    booking.balanceDue = Math.max(0, (Number(booking.totalAmount || booking.packagePrice) || 0) - (Number(booking.advancePaid) || 0) - fuelDed);
    return fuelDed;
};

module.exports = { getGuestFuelTotalForBooking, applyGuestFuelFloor };
