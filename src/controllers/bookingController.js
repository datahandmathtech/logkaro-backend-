const Booking = require('../models/Booking');
const DRSDuty = require('../models/DRSDuty');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const asyncHandler = require('express-async-handler');

// @desc    Get all bookings for a company with filters
// @route   GET /api/bookings/:companyId
// @access  Private/AdminOrExecutive
const getBookings = asyncHandler(async (req, res) => {
    const { status, paymentStatus, search, startDate, endDate } = req.query;
    let query = { company: req.params.companyId };

    if (status && status !== 'All') {
        query.bookingStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'All') {
        query.paymentStatus = paymentStatus;
    }

    if (startDate && endDate) {
        query.travelStartDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (search) {
        query.$or = [
            { bookingId: { $regex: search, $options: 'i' } },
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { vehicleType: { $regex: search, $options: 'i' } }
        ];
    }

    const bookings = await Booking.find(query)
        .populate('lead', 'leadId status totalAmount')
        .populate('client', 'name mobile balance')
        .sort({ createdAt: -1 });

    res.json(bookings);
});

// @desc    Get single booking by ID
// @route   GET /api/bookings/single/:id
// @access  Private/AdminOrExecutive
const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('company')
        .populate('lead')
        .populate('client')
        .populate({
            path: 'drsDuties',
            populate: [
                { path: 'driver', select: 'name phone' },
                { path: 'vehicle', select: 'carNumber model' }
            ]
        });

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    res.json(booking);
});

// @desc    Update a booking
// @route   PUT /api/bookings/single/:id
// @access  Private/AdminOrExecutive
const updateBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    const { bookingStatus, paymentStatus, notes, termsAndConditions } = req.body;

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (notes !== undefined) booking.notes = notes;
    if (termsAndConditions) booking.termsAndConditions = termsAndConditions;

    await booking.save();
    res.json(booking);
});

// @desc    Record a payment against a booking
// @route   POST /api/bookings/:id/payment
// @access  Private/AdminOrExecutive
const recordBookingPayment = asyncHandler(async (req, res) => {
    const { amount, paymentMode, paymentReference, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
        res.status(400);
        throw new Error('Valid payment amount is required');
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    booking.advancePaid += paymentAmount;
    booking.balanceDue = Math.max(0, booking.totalAmount - booking.advancePaid);

    if (booking.balanceDue <= 0) {
        booking.paymentStatus = 'Full Received';
    } else {
        booking.paymentStatus = 'Partial';
    }

    await booking.save();

    // Update Client balance
    if (booking.client) {
        const client = await Client.findById(booking.client);
        if (client) {
            client.totalPaid += paymentAmount;
            client.balance = Math.max(0, client.balance - paymentAmount);
            await client.save();
        }
    }

    // Create Ledger Entry
    await LedgerEntry.create({
        client: booking.client,
        company: booking.company,
        type: 'Payment',
        amount: paymentAmount,
        description: `Payment received for ${booking.bookingId} (${booking.clientCode || ''}) via ${paymentMode || 'Cash'} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
        referenceId: booking._id
    });

    // Create Bank Transaction & Update Bank Account Balance
    try {
        let bank = null;
        if (req.body.bankAccountId) {
            bank = await BankAccount.findById(req.body.bankAccountId);
        }
        if (!bank) {
            bank = await BankAccount.findOne({ company: booking.company, isDefault: true })
                || await BankAccount.findOne({ company: booking.company });
        }

        if (bank) {
            await BankTransaction.create({
                company: booking.company,
                bankAccount: bank._id,
                bankName: bank.bankName || '',
                type: 'IN',
                amount: paymentAmount,
                paymentMode: paymentMode || 'Bank Transfer / NEFT',
                category: 'Booking Payment',
                reference: paymentReference || '',
                description: `Payment received for Booking ${booking.bookingId} (${booking.clientCode || ''}) - ${booking.clientName}`,
                bookingRef: booking._id,
                clientRef: booking.client || null,
                date: new Date(),
                createdBy: req.user ? req.user._id : null
            });
            bank.currentBalance = (bank.currentBalance || 0) + paymentAmount;
            await bank.save();
        }
    } catch (bankErr) {
        console.error('Error creating bank transaction on booking payment:', bankErr);
    }

    res.json({
        message: 'Payment recorded successfully and synced to Bank Book',
        booking
    });
});

// @desc    Cancel a booking
// @route   POST /api/bookings/:id/cancel
// @access  Private/AdminOrExecutive
const cancelBooking = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    booking.bookingStatus = 'Cancelled';
    booking.notes = `${booking.notes ? booking.notes + ' | ' : ''}Cancelled: ${reason || 'Customer request'}`;
    await booking.save();

    // Also cancel all linked DRS duties
    if (booking.drsDuties && booking.drsDuties.length > 0) {
        await DRSDuty.updateMany(
            { _id: { $in: booking.drsDuties } },
            { $set: { status: 'Cancelled' } }
        );
    }

    res.json({ message: 'Booking and linked duties cancelled successfully', booking });
});

// @desc    Assign driver and vehicle to booking itinerary days and shoot into DRS
// @route   POST /api/bookings/:id/assign-drivers
// @access  Private/AdminOrExecutive
const assignBookingDrivers = asyncHandler(async (req, res) => {
    const { itinerary } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    if (Array.isArray(itinerary)) {
        booking.itinerary = itinerary;
        await booking.save();

        // Sync each day into DRSDuty
        for (const [idx, day] of itinerary.entries()) {
            const dayNo = day.dayNo || (idx + 1);
            let dateStr = null;
            if (day.date) {
                try {
                    dateStr = new Date(day.date).toISOString().split('T')[0];
                } catch (_) {}
            }

            const driverId = day.driverId && day.driverId !== 'custom' && day.driverId !== '__custom__' ? day.driverId : null;
            const driverName = day.driverName || day.customDriverName || '';
            const driverPhone = day.driverPhone || day.driverMobile || '';
            const vehicleId = day.vehicleId || day.vehicle || null;
            const vehicleNumber = day.vehicleNumber || day.customCarNumber || '';
            const isAssigned = !!(driverId || driverName);

            // Broad query to match duties created either during lead conversion or previous saves
            const matchConditions = [
                { bookingRef: booking._id },
                { bookingId: booking.bookingId }
            ];
            if (booking.lead) {
                matchConditions.push({ leadId: booking.lead });
            }

            let candidateDuties = await DRSDuty.find({ $or: matchConditions });

            // Find matching candidate by dayNo or calendar date
            let matchingDuty = candidateDuties.find(d => d.dayNo === dayNo);
            if (!matchingDuty && dateStr) {
                matchingDuty = candidateDuties.find(d => {
                    if (!d.date) return false;
                    try {
                        return new Date(d.date).toISOString().split('T')[0] === dateStr;
                    } catch (_) {
                        return false;
                    }
                });
            }

            if (matchingDuty) {
                matchingDuty.bookingRef = booking._id;
                matchingDuty.bookingId = booking.bookingId;
                matchingDuty.dayNo = dayNo;
                matchingDuty.driver = driverId;
                matchingDuty.customDriverName = driverName;
                matchingDuty.driverMobile = driverPhone;
                matchingDuty.vehicle = vehicleId;
                matchingDuty.customCarNumber = vehicleNumber;
                matchingDuty.status = isAssigned ? 'Assigned' : (matchingDuty.status || 'Scheduled');
                if (day.time) matchingDuty.time = day.time;
                if (day.duty || day.description) {
                    matchingDuty.duty = day.duty || day.description;
                    matchingDuty.itinerary = day.duty || day.description;
                }
                if (day.km) matchingDuty.km = day.km;
                await matchingDuty.save();

                // Clean up any other duplicates for this same day
                const duplicates = candidateDuties.filter(d => 
                    String(d._id) !== String(matchingDuty._id) && 
                    (d.dayNo === dayNo || (dateStr && d.date && new Date(d.date).toISOString().split('T')[0] === dateStr))
                );
                if (duplicates.length > 0) {
                    const dupIds = duplicates.map(d => d._id);
                    await DRSDuty.deleteMany({ _id: { $in: dupIds } });
                }
            } else {
                const dutyText = day.duty || day.description || 'Scheduled Duty';
                const newDuty = await DRSDuty.create({
                    company: booking.company,
                    bookingRef: booking._id,
                    bookingId: booking.bookingId,
                    leadId: booking.lead || null,
                    clientName: booking.clientName,
                    mobileNumber: booking.mobileNumber,
                    date: day.date || booking.travelStartDate || new Date(),
                    time: day.time || '09:00 AM',
                    pickupPoint: day.pickupPoint || '',
                    duty: dutyText,
                    itinerary: dutyText,
                    dayNo: dayNo,
                    carType: day.vehicleType || booking.vehicleType || 'Innova Crysta',
                    driver: driverId,
                    customDriverName: driverName,
                    driverMobile: driverPhone,
                    vehicle: vehicleId,
                    customCarNumber: vehicleNumber,
                    revenue: day.amount || 0,
                    km: day.km || '',
                    paymentStatus: booking.paymentStatus === 'Full Received' ? 'Full Received' : 'Advance Received',
                    status: isAssigned ? 'Assigned' : 'Scheduled',
                    isDirectBooking: false
                });

                if (!booking.drsDuties) booking.drsDuties = [];
                booking.drsDuties.push(newDuty._id);
                await booking.save();
            }
        }
    }

    res.json({
        message: 'Driver assignments saved and synced to DRS successfully',
        booking
    });
});

module.exports = {
    getBookings,
    getBookingById,
    updateBooking,
    recordBookingPayment,
    cancelBooking,
    assignBookingDrivers
};
