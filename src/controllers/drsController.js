const DRSDuty = require('../models/DRSDuty');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const CashTransaction = require('../models/CashTransaction');
const Company = require('../models/Company');
const { removeFinancialTransaction } = require('../services/transactionSyncService');
const { getNextClientCode } = require('../models/Sequence');
const asyncHandler = require('express-async-handler');

// @desc    Get DRS duties for a company by date, view, or date range
// @route   GET /api/drs/:companyId
// @access  Private/AdminOrExecutive
const getDRSDuties = asyncHandler(async (req, res) => {
    const { date, from, to, view, search } = req.query;
    let query = { company: req.params.companyId };

    if (view === 'today-tomorrow') {
        const { DateTime } = require('luxon');
        const nowIST = DateTime.now().setZone('Asia/Kolkata');
        const startToday = nowIST.startOf('day').minus({ hours: 6 }).toJSDate();
        const endTomorrow = nowIST.plus({ days: 1 }).endOf('day').toJSDate();
        query.date = {
            $gte: startToday,
            $lte: endTomorrow
        };
    } else if (view === 'upcoming') {
        const { DateTime } = require('luxon');
        const startToday = DateTime.now().setZone('Asia/Kolkata').startOf('day').minus({ hours: 6 }).toJSDate();
        query.date = { $gte: startToday };
    } else if (view === 'all') {
        // No date restriction
    } else if (from && to) {
        const { DateTime } = require('luxon');
        const fromStr = typeof from === 'string' ? from.split('T')[0] : new Date(from).toISOString().split('T')[0];
        const toStr = typeof to === 'string' ? to.split('T')[0] : new Date(to).toISOString().split('T')[0];
        const startDT = DateTime.fromISO(fromStr, { zone: 'Asia/Kolkata' }).startOf('day').minus({ hours: 6 }).toJSDate();
        const endDT = DateTime.fromISO(toStr, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
        query.date = {
            $gte: startDT,
            $lte: endDT
        };
    } else if (date && date !== 'all') {
        const { DateTime } = require('luxon');
        const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
        const dayDT = DateTime.fromISO(dateStr, { zone: 'Asia/Kolkata' });
        const fetchStart = dayDT.startOf('day').minus({ hours: 6 }).toJSDate();
        const fetchEnd = dayDT.endOf('day').toJSDate();

        query.date = {
            $gte: fetchStart,
            $lte: fetchEnd
        };
    }

    if (search) {
        query.$or = [
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { hotel: { $regex: search, $options: 'i' } },
            { duty: { $regex: search, $options: 'i' } },
            { bookingId: { $regex: search, $options: 'i' } },
            { carType: { $regex: search, $options: 'i' } },
            { customCarNumber: { $regex: search, $options: 'i' } },
            { customDriverName: { $regex: search, $options: 'i' } },
            { itinerary: { $regex: search, $options: 'i' } }
        ];
    }

    const duties = await DRSDuty.find(query)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status totalAmount')
        .populate('bookingRef', 'bookingId clientCode clientName totalAmount advancePaid balanceDue bookingStatus paymentStatus travelStartDate travelEndDate itinerary vehicleType client')
        .sort({ date: 1, time: 1 });
        
    res.json(duties);
});

// @desc    Create a DRS duty (Direct or Linked from Booking/Lead/Client)
// @route   POST /api/drs
// @access  Private/AdminOrExecutive
const createDRSDuty = asyncHandler(async (req, res) => {
    let {
        company, clientName, mobileNumber, hotel, date, endDate, time,
        carType, customCarNumber, driver, customDriverName, vehicle, itinerary,
        revenue, cOut, status, km,
        leadId, bookingId, bookingRef, pickupPoint, duty: dutyText, guestRemarks,
        createConfirmedBooking, advancePaid, paymentMode, bankAccountId, paymentReference, notes
    } = req.body;

    const dutyDate = date ? new Date(date) : new Date();
    const endDateObj = endDate ? new Date(endDate) : dutyDate;
    const totalDays = Math.max(1, Math.round((endDateObj - dutyDate) / (1000 * 60 * 60 * 24)) + 1);

    const totalRev = Number(revenue) || 0;
    const advance = Number(advancePaid) || 0;
    const balanceDue = Math.max(0, totalRev - advance);

    let createdBooking = null;

    // Direct Operations Booking: Auto-create Confirmed Booking if requested or direct
    if (createConfirmedBooking && !bookingRef && !bookingId) {
        const clientCode = await getNextClientCode(company, dutyDate);
        bookingId = clientCode;

        // 1. Client resolution
        let client = null;
        if (mobileNumber && mobileNumber !== 'TBA') {
            client = await Client.findOne({ company, mobile: mobileNumber });
        }
        if (!client) {
            client = await Client.create({
                company,
                name: clientName || 'Guest (TBA)',
                mobile: (mobileNumber && mobileNumber !== 'TBA') ? mobileNumber : `DRS-${Date.now().toString().slice(-6)}`,
                clientType: 'Direct',
                totalBilled: totalRev,
                totalPaid: advance,
                balance: balanceDue
            });
        } else {
            client.totalBilled += totalRev;
            client.totalPaid += advance;
            client.balance += balanceDue;
            await client.save();
        }

        // 2. Ledger Bill Entry
        await LedgerEntry.create({
            client: client._id,
            company,
            type: 'Bill',
            amount: totalRev,
            date: dutyDate,
            description: `Booking Confirmed (${clientCode}) - ${clientName || 'Guest'}`,
            referenceId: null
        });

        // 3. Advance Payment Entry
        if (advance > 0) {
            await LedgerEntry.create({
                client: client._id,
                company,
                type: 'Advance',
                amount: advance,
                date: dutyDate,
                description: `Advance received for Booking ${clientCode} via ${paymentMode || 'Cash'} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
                referenceId: null
            });

            // 4. Cash / Bank Transaction
            const isCash = (
                paymentMode === 'Cash' ||
                paymentMode === 'Driver Cash' ||
                paymentMode === 'Cash to Company' ||
                (paymentMode && paymentMode.toLowerCase().includes('cash'))
            );

            if (isCash) {
                try {
                    await CashTransaction.create({
                        company,
                        type: 'IN',
                        amount: advance,
                        category: 'Booking Advance',
                        reference: paymentReference || '',
                        description: `Advance Payment Received - ${clientName || 'Guest'} (${clientCode})`,
                        clientRef: client._id,
                        guestName: clientName || '',
                        sourceId: firstDuty._id,
                        sourceType: 'DRSDuty',
                        date: dutyDate,
                        createdBy: req.user ? req.user._id : null
                    });
                    await Company.findByIdAndUpdate(company, {
                        $inc: { cashBalance: advance }
                    });
                } catch (cErr) {
                    console.error('Error creating cash transaction for DRS advance:', cErr);
                }
            } else if (bankAccountId) {
                const bank = await BankAccount.findById(bankAccountId);
                if (bank) {
                    await BankTransaction.create({
                        company,
                        bankAccount: bank._id,
                        bankName: bank.bankName || '',
                        type: 'IN',
                        amount: advance,
                        category: 'Booking Advance',
                        paymentMode: paymentMode || 'UPI / QR Code',
                        reference: paymentReference || '',
                        description: `Advance Payment Received - ${clientName || 'Guest'} (${clientCode})`,
                        clientRef: client._id,
                        sourceId: firstDuty._id,
                        sourceType: 'DRSDuty',
                        date: dutyDate,
                        createdBy: req.user ? req.user._id : null
                    });
                    bank.currentBalance += advance;
                    await bank.save();
                }
            }
        }

        // Build multi-day itinerary for Booking
        const bookingItinerary = [];
        for (let i = 0; i < totalDays; i++) {
            const dayDate = new Date(dutyDate);
            dayDate.setDate(dutyDate.getDate() + i);
            const dText = i === 0 ? (dutyText || itinerary || 'City Duty') : (i === totalDays - 1 ? 'City Tour & Drop' : 'City Sightseeing');
            bookingItinerary.push({
                dayNo: i + 1,
                date: dayDate,
                time: time || '09:00 AM',
                pickupPoint: pickupPoint || hotel || '',
                duty: dText,
                description: dText,
                vehicleType: carType || 'Sedan',
                vehicleCount: 1,
                amount: i === 0 ? totalRev : 0,
                driver: driver || null,
                vehicle: vehicle || null,
                driverName: customDriverName || '',
                vehicleNumber: customCarNumber || ''
            });
        }

        // 5. Booking Document
        createdBooking = await Booking.create({
            bookingId: clientCode,
            clientCode: clientCode,
            company,
            client: client._id,
            salesPerson: req.user ? req.user.name : 'Operations',
            source: hotel ? `Live DRS (${hotel})` : 'Live DRS Operations',
            bookingReference: 'Direct',
            clientName: clientName || 'Guest (TBA)',
            mobileNumber: mobileNumber || 'TBA',
            bookingDate: new Date(),
            travelStartDate: dutyDate,
            travelEndDate: endDateObj,
            vehicleType: carType || 'Sedan',
            numberOfCars: 1,
            itinerary: bookingItinerary,
            totalAmount: totalRev,
            advancePaid: advance,
            advanceDate: advance > 0 ? dutyDate : null,
            balanceDue: balanceDue,
            bookingStatus: 'Confirmed',
            paymentStatus: (advance >= totalRev && totalRev > 0) ? 'Full Received' : (advance > 0 ? 'Advance Received' : 'No Advance'),
            notes: notes || guestRemarks || 'Direct Instant Booking from Live DRS'
        });

        bookingRef = createdBooking._id;
    }

    // Create DRS Duties for each day from start date to end date
    const createdDuties = [];
    for (let i = 0; i < totalDays; i++) {
        const dayDate = new Date(dutyDate);
        dayDate.setDate(dutyDate.getDate() + i);
        const dText = i === 0 ? (dutyText || itinerary || 'City Duty') : (i === totalDays - 1 ? 'City Tour & Drop' : 'City Sightseeing');

        const duty = await DRSDuty.create({
            company,
            clientName: clientName || 'Guest (TBA)',
            mobileNumber: mobileNumber || '',
            hotel: hotel || '',
            date: dayDate,
            time: time || '09:00 AM',
            carType: carType || 'Sedan',
            customCarNumber: customCarNumber || '',
            driver: driver || null,
            customDriverName: customDriverName || '',
            vehicle: vehicle || null,
            itinerary: dText,
            duty: dText,
            dayNo: i + 1,
            pickupPoint: pickupPoint || hotel || '',
            revenue: i === 0 ? totalRev : 0,
            km: km || '',
            cOut: cOut || '',
            paymentStatus: (advance >= totalRev && totalRev > 0) ? 'Full Received' : (advance > 0 ? 'Advance Received' : 'Pending'),
            status: status || (driver || customDriverName ? 'Assigned' : 'Scheduled'),
            leadId: leadId || null,
            bookingId: bookingId || null,
            bookingRef: bookingRef || null,
            guestRemarks: guestRemarks || '',
            isDirectBooking: !leadId
        });

        createdDuties.push(duty);
    }

    const firstDuty = createdDuties[0];

    if (createdBooking) {
        createdBooking.drsDuties = createdDuties.map(d => d._id);
        await createdBooking.save();
    }

    const populated = await DRSDuty.findById(firstDuty._id)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status')
        .populate('bookingRef', 'bookingId clientCode clientName totalAmount advancePaid balanceDue bookingStatus travelStartDate travelEndDate itinerary vehicleType');

    res.status(201).json({
        duty: populated,
        createdDuties,
        totalDaysCreated: createdDuties.length,
        booking: createdBooking,
        clientCode: bookingId || firstDuty.bookingId,
        message: totalDays > 1
            ? `Successfully created ${totalDays} daily DRS duties from ${dutyDate.toISOString().split('T')[0]} to ${endDateObj.toISOString().split('T')[0]}`
            : (createdBooking ? 'Duty created and Confirmed Booking generated successfully' : 'DRS Duty created successfully')
    });
});

// @desc    Update a DRS duty (including assigning driver/vehicle)
// @route   PUT /api/drs/:id
// @access  Private/AdminOrExecutive
const updateDRSDuty = asyncHandler(async (req, res) => {
    const duty = await DRSDuty.findById(req.params.id);

    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    const updatedDuty = await DRSDuty.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
    .populate('driver', 'name mobile')
    .populate('vehicle', 'carNumber model type brand')
    .populate('leadId', 'clientName leadId status')
    .populate('bookingRef', 'bookingId clientCode clientName totalAmount advancePaid balanceDue bookingStatus');

    // Sync back to Booking itinerary ("both ways")
    if (updatedDuty.bookingRef || updatedDuty.bookingId) {
        try {
            const bkg = await Booking.findOne({
                $or: [
                    { _id: updatedDuty.bookingRef },
                    { bookingId: updatedDuty.bookingId }
                ]
            });
            if (bkg && Array.isArray(bkg.itinerary)) {
                let modified = false;
                const dutyDate = updatedDuty.date ? new Date(updatedDuty.date).toISOString().split('T')[0] : '';
                bkg.itinerary = bkg.itinerary.map(item => {
                    const itemDate = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
                    if (item.dayNo === updatedDuty.dayNo || (dutyDate && itemDate === dutyDate)) {
                        modified = true;
                        return {
                            ...item,
                            driver: updatedDuty.driver?._id || updatedDuty.driver || null,
                            driverId: updatedDuty.driver?._id || updatedDuty.driver || '',
                            driverName: updatedDuty.driver?.name || updatedDuty.customDriverName || '',
                            driverPhone: updatedDuty.driver?.mobile || updatedDuty.driverMobile || '',
                            vehicle: updatedDuty.vehicle?._id || updatedDuty.vehicle || null,
                            vehicleId: updatedDuty.vehicle?._id || updatedDuty.vehicle || '',
                            vehicleNumber: updatedDuty.vehicle?.carNumber || updatedDuty.customCarNumber || ''
                        };
                    }
                    return item;
                });
                if (modified) {
                    await bkg.save();
                }
            }
        } catch (syncErr) {
            console.error('Error syncing DRS update back to Booking itinerary:', syncErr);
        }
    }

    res.json(updatedDuty);
});

// @desc    Delete a DRS duty
// @route   DELETE /api/drs/:id
// @access  Private/AdminOrExecutive
const deleteDRSDuty = asyncHandler(async (req, res) => {
    const duty = await DRSDuty.findById(req.params.id);

    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    await removeFinancialTransaction({ sourceId: duty._id });
    await duty.deleteOne();
    res.json({ message: 'Duty removed' });
});

// @desc    Get DRS duties by vehicle number and date (for Fuel guest auto-fetch)
// @route   GET /api/drs/:companyId/by-vehicle
// @access  Private/AdminOrExecutive
const getDRSDutiesByVehicle = asyncHandler(async (req, res) => {
    const { vehicleNumber, date } = req.query;

    if (!vehicleNumber || !date) {
        res.status(400);
        throw new Error('vehicleNumber and date are required');
    }

    // Build date range for the specific day (IST-aware via Luxon)
    const { DateTime } = require('luxon');
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const dayDT = DateTime.fromISO(dateStr, { zone: 'Asia/Kolkata' });
    const fetchStart = dayDT.startOf('day').minus({ hours: 6 }).toJSDate();
    const fetchEnd = dayDT.endOf('day').toJSDate();

    // Clean vehicle number and create a flexible regex that matches any spacing or dashes (e.g. 'RJ27 TB 0160', 'RJ-27-TB-0160', 'RJ27TB0160')
    const rawNumber = (vehicleNumber || '').split('#')[0].trim();
    const chars = rawNumber.replace(/[\s\-]/g, '').split('');
    const flexRegexPattern = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-]*');

    const Vehicle = require('../models/Vehicle');
    const matchingVehicles = await Vehicle.find({
        company: req.params.companyId,
        carNumber: { $regex: flexRegexPattern, $options: 'i' }
    });
    const vehicleIds = matchingVehicles.map(v => v._id);

    const vehicleOrConditions = [
        { customCarNumber: { $regex: flexRegexPattern, $options: 'i' } },
        { vehicleNumber: { $regex: flexRegexPattern, $options: 'i' } }
    ];
    if (vehicleIds.length > 0) {
        vehicleOrConditions.push({ vehicle: { $in: vehicleIds } });
    }

    const duties = await DRSDuty.find({
        company: req.params.companyId,
        date: { $gte: fetchStart, $lte: fetchEnd },
        $or: vehicleOrConditions,
        status: { $nin: ['Cancelled', 'No-show'] }
    })
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status totalAmount')
        .populate({
            path: 'bookingRef',
            select: 'bookingId clientCode clientName totalAmount advancePaid balanceDue bookingStatus client',
            populate: { path: 'client', select: 'name mobile _id' }
        })
        .sort({ time: 1 });

    res.json(duties);
});

// @desc    Collect payment for a DRS Duty / Booking
// @route   POST /api/drs/:id/collect-payment
// @access  Private/AdminOrExecutive
const collectDRSPayment = asyncHandler(async (req, res) => {
    const { amount, paymentMode, bankAccountId, paymentReference, notes, markFullPaid } = req.body;
    const dutyId = req.params.id;

    const duty = await DRSDuty.findById(dutyId);
    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    const numAmount = Number(amount) || 0;
    const payMode = paymentMode || 'UPI / QR Code';

    let booking = null;
    if (duty.bookingRef) {
        booking = await Booking.findById(duty.bookingRef).populate('client');
    } else if (duty.bookingId) {
        booking = await Booking.findOne({
            company: duty.company,
            $or: [{ bookingId: duty.bookingId }, { clientCode: duty.bookingId }]
        }).populate('client');
    }

    if (booking) {
        booking.advancePaid = (booking.advancePaid || 0) + numAmount;
        booking.balanceDue = Math.max(0, (booking.totalAmount || 0) - booking.advancePaid);
        if (markFullPaid || booking.balanceDue === 0) {
            booking.balanceDue = 0;
            booking.paymentStatus = 'Full Received';
        } else if (booking.advancePaid > 0) {
            booking.paymentStatus = 'Advance Received';
        }
        await booking.save();

        // Update Client Ledger & Balance
        let client = booking.client;
        if (!client && booking.mobileNumber && booking.mobileNumber !== 'TBA') {
            client = await Client.findOne({ company: duty.company, mobile: booking.mobileNumber });
        }
        if (client) {
            client.totalPaid = (client.totalPaid || 0) + numAmount;
            client.balance = Math.max(0, (client.totalBilled || 0) - client.totalPaid);
            await client.save();

            await LedgerEntry.create({
                client: client._id,
                company: duty.company,
                type: 'Payment',
                amount: numAmount,
                date: new Date(),
                description: `Payment received for Booking ${booking.bookingId} (${duty.duty || 'Duty'}) via ${payMode} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
                referenceId: duty._id
            });
        }

        // Update all DRS duties linked to this booking to sync paymentStatus
        await DRSDuty.updateMany(
            { bookingRef: booking._id },
            { paymentStatus: booking.paymentStatus }
        );
    } else {
        // Direct duty without formal booking
        duty.revenue = duty.revenue || 0;
        const currentPaid = (duty.revenue > 0 && duty.paymentStatus === 'Full Received') ? duty.revenue : 0;
        const newTotalPaid = currentPaid + numAmount;
        if (markFullPaid || newTotalPaid >= duty.revenue) {
            duty.paymentStatus = 'Full Received';
        } else if (newTotalPaid > 0) {
            duty.paymentStatus = 'Advance Received';
        }
        await duty.save();
    }

    // Sync to Cash Book or Bank Book
    if (numAmount > 0) {
        const isCash = (
            payMode === 'Cash' ||
            payMode === 'Driver Cash' ||
            payMode === 'Cash to Company' ||
            (payMode && payMode.toLowerCase().includes('cash'))
        );

        if (isCash) {
            try {
                await CashTransaction.create({
                    company: duty.company,
                    type: 'IN',
                    amount: numAmount,
                    category: 'Booking Payment',
                    reference: paymentReference || '',
                    description: `Payment Collected - ${duty.clientName || 'Guest'} (${duty.bookingId || 'DRS'}) via ${payMode}`,
                    bookingRef: duty.bookingRef || null,
                    bookingId: duty.bookingId || '',
                    guestName: duty.clientName || '',
                    sourceId: duty._id,
                    sourceType: 'DRSPayment',
                    date: new Date(),
                    createdBy: req.user._id
                });
                await Company.findByIdAndUpdate(duty.company, {
                    $inc: { cashBalance: numAmount }
                });
            } catch (cErr) {
                console.error('Error creating cash transaction for DRS payment:', cErr);
            }
        } else if (bankAccountId) {
            const bank = await BankAccount.findById(bankAccountId);
            if (bank) {
                bank.currentBalance += numAmount;
                await bank.save();

                await BankTransaction.create({
                    company: duty.company,
                    bankAccount: bank._id,
                    bankName: bank.bankName || '',
                    type: 'IN',
                    amount: numAmount,
                    category: 'Booking Payment',
                    paymentMode: payMode,
                    reference: paymentReference || '',
                    description: `Payment Collected - ${duty.clientName || 'Guest'} (${duty.bookingId || 'DRS'}) via ${payMode}`,
                    sourceId: duty._id,
                    sourceType: 'DRSPayment',
                    date: new Date(),
                    createdBy: req.user._id
                });
            }
        }
    }

    const updated = await DRSDuty.findById(dutyId)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status')
        .populate({
            path: 'bookingRef',
            select: 'bookingId clientCode clientName totalAmount advancePaid balanceDue bookingStatus travelStartDate travelEndDate itinerary vehicleType client',
            populate: { path: 'client', select: 'name mobile totalBilled totalPaid balance' }
        });

    res.json({
        success: true,
        message: 'Payment collected successfully',
        duty: updated,
        booking: booking
    });
});

module.exports = {
    getDRSDuties,
    createDRSDuty,
    updateDRSDuty,
    deleteDRSDuty,
    getDRSDutiesByVehicle,
    collectDRSPayment
};
