const Lead = require('../models/Lead');
const DRSDuty = require('../models/DRSDuty');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const CashTransaction = require('../models/CashTransaction');
const Company = require('../models/Company');
const { removeFinancialTransaction } = require('../services/transactionSyncService');
const { getNextSequence, getNextClientCode, previewNextClientCode } = require('../models/Sequence');
const asyncHandler = require('express-async-handler');

// @desc    Preview next client code for a company
// @route   GET /api/leads/next-client-code/:companyId
// @access  Private/AdminOrExecutive
const getNextClientCodePreview = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const code = await previewNextClientCode(req.params.companyId, date ? new Date(date) : new Date());
    res.json({ clientCode: code });
});

// Throttle map so Lead.updateMany runs at most once every 5 minutes per company in the background
const LAST_LEAD_AUTO_SYNC = new Map();
const LEAD_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// @desc    Get all leads for a company
// @route   GET /api/leads/:companyId
// @access  Private/AdminOrExecutive
const getLeads = asyncHandler(async (req, res) => {
    const { status, search, month, salesPerson, source, fy, dateType } = req.query;
    const companyId = req.params.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Throttled non-blocking background maintenance for expired/cancelled leads
    const lastSync = LAST_LEAD_AUTO_SYNC.get(String(companyId)) || 0;
    if (Date.now() - lastSync > LEAD_SYNC_INTERVAL_MS) {
        LAST_LEAD_AUTO_SYNC.set(String(companyId), Date.now());
        Promise.all([
            Lead.updateMany(
                {
                    company: companyId,
                    status: { $nin: ['Confirmed', 'Lost'] },
                    bookingId: null,
                    notes: { $not: /Restored from Lost|Reopened to Active/i },
                    $or: [
                        { status: 'Cancelled' },
                        { travelEndDate: { $lt: today } },
                        { travelEndDate: null, travelStartDate: { $lt: today } }
                    ]
                },
                {
                    $set: { status: 'Lost', priority: 'Lost' }
                }
            ),
            Lead.updateMany(
                {
                    company: companyId,
                    status: 'Cancelled',
                    priority: { $ne: 'Lost' }
                },
                {
                    $set: { status: 'Lost', priority: 'Lost' }
                }
            )
        ]).catch(e => {
            console.error('Error auto-moving expired/cancelled leads to Lost:', e);
        });
    }

    let query = { company: companyId };

    if (status && status !== 'All') {
        query.status = status;
    }

    if (source && source !== 'All') {
        query.source = source;
    }

    if (salesPerson && salesPerson !== 'All') {
        query.salesPerson = salesPerson;
    }

    if (search) {
        query.$or = [
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { leadId: { $regex: search, $options: 'i' } },
            { clientCode: { $regex: search, $options: 'i' } },
            { source: { $regex: search, $options: 'i' } },
            { travelAgentName: { $regex: search, $options: 'i' } },
            { travelAgentMobile: { $regex: search, $options: 'i' } }
        ];
    }

    let leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

    // Instant in-memory status normalization so expired/cancelled leads reflect as Lost without waiting for DB write
    const restoreRegex = /Restored from Lost|Reopened to Active/i;
    for (let i = 0; i < leads.length; i++) {
        const l = leads[i];
        if (l.status === 'Cancelled' && l.priority !== 'Lost') {
            l.status = 'Lost';
            l.priority = 'Lost';
        } else if (l.status !== 'Confirmed' && l.status !== 'Lost' && !l.bookingId && !restoreRegex.test(l.notes || '')) {
            const endOrStart = l.travelEndDate ? new Date(l.travelEndDate) : (l.travelStartDate ? new Date(l.travelStartDate) : null);
            if (endOrStart && endOrStart < today) {
                l.status = 'Lost';
                l.priority = 'Lost';
            }
        }
    }

    // Month filter (e.g. 'Apr', 'May', '04', '05')
    if (month && month !== 'All') {
        const MONTH_MAP = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const mStr = MONTH_MAP[month] || month;

        leads = leads.filter(lead => {
            const isMatchMonth = (rawDate) => {
                if (!rawDate) return false;
                if (typeof rawDate === 'string' && rawDate.includes('-')) {
                    const parts = rawDate.split('T')[0].split('-');
                    if (parts.length >= 2) {
                        return parts[1] === mStr;
                    }
                }
                const d = new Date(rawDate);
                if (isNaN(d.getTime())) return false;
                const m = String(d.getMonth() + 1).padStart(2, '0');
                return m === mStr;
            };

            if (dateType === 'leadCreated') {
                return isMatchMonth(lead.leadDate || lead.createdAt);
            }

            // Strictly match the lead's Travel Month (fallback to leadDate/createdAt only if travelStartDate is missing)
            const targetDate = lead.travelStartDate || lead.leadDate || lead.createdAt;
            return isMatchMonth(targetDate);
        });
    }

    // Financial Year filter (e.g. 'FY 26-27', 'FY 27-28')
    if (fy && fy !== 'All FY') {
        leads = leads.filter(lead => {
            const travelDate = dateType === 'leadCreated'
                ? (lead.leadDate || lead.createdAt)
                : (lead.travelStartDate || lead.leadDate || lead.createdAt);
            if (!travelDate) return false;
            const d = new Date(travelDate);
            if (isNaN(d.getTime())) return false;
            // IST offset (+5.5 hours)
            const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
            const y = istDate.getUTCFullYear();
            const m = istDate.getUTCMonth();
            const startYear = m >= 3 ? y : y - 1;
            const endYear = startYear + 1;
            const leadFy = `FY ${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
            return leadFy === fy;
        });
    }

    res.json(leads);
});

// @desc    Check duplicate phone number across leads and clients
// @route   GET /api/leads/check-phone/:companyId
// @access  Private/AdminOrExecutive
const checkDuplicatePhone = asyncHandler(async (req, res) => {
    const { phone } = req.query;
    if (!phone || phone.trim().length < 6) {
        return res.json({ exists: false, count: 0, history: [] });
    }

    const cleanPhone = phone.trim();
    const [existingLeads, existingBookings] = await Promise.all([
        Lead.find({
            company: req.params.companyId,
            mobileNumber: { $regex: cleanPhone }
        }).select('leadId clientName mobileNumber status travelStartDate totalAmount createdAt').sort({ createdAt: -1 }).limit(5).lean(),
        Booking.find({
            company: req.params.companyId,
            mobileNumber: { $regex: cleanPhone }
        }).select('bookingId clientName mobileNumber bookingStatus travelStartDate totalAmount').sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const exists = existingLeads.length > 0 || existingBookings.length > 0;
    res.json({
        exists,
        count: existingLeads.length + existingBookings.length,
        leads: existingLeads,
        bookings: existingBookings
    });
});

// @desc    Get single lead
// @route   GET /api/leads/single/:id
// @access  Private/AdminOrExecutive
const getLeadById = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }
    res.json(lead);
});

// @desc    Create a new lead
// @route   POST /api/leads
// @access  Private/AdminOrExecutive
const createLead = asyncHandler(async (req, res) => {
    const {
        company, clientName, mobileNumber, alternateMobile, email, gstin,
        source, reference, salesPerson, leadDate, travelStartDate, travelEndDate,
        isBreakTour, excludedDates, activeDaysCount,
        carType, numberOfCars, itinerary, extraCharges, totalAmount, advanceDate, gstMode, gstRate, notes,
        specialRemarks, inclusions, bookingReference, travelAgent, travelAgentName, travelAgentMobile, priority
    } = req.body;

    const leadDateObj = leadDate ? new Date(leadDate) : new Date();
    const clientCode = await getNextClientCode(company, leadDateObj);
    const leadId = clientCode;

    // Handle Travel Agent defaults for guest details if not provided
    const isAgent = bookingReference === 'Travel Agent' || source === 'Agent';
    const finalBookingRef = isAgent ? 'Travel Agent' : (bookingReference || 'Direct');
    const finalClientName = clientName && clientName.trim() ? clientName.trim() : (isAgent ? (travelAgentName ? `${travelAgentName} (Guest)` : 'Guest (TBA)') : 'Guest (TBA)');
    const finalMobile = mobileNumber && mobileNumber.trim() ? mobileNumber.trim() : (isAgent ? (travelAgentMobile || 'TBA') : 'TBA');

    // Ensure itinerary items have proper default fields
    const formattedItinerary = (itinerary || []).map((day, idx) => ({
        dayNo: day.dayNo || (idx + 1),
        date: day.date,
        time: day.isApg ? 'APG' : (day.time || '09:00 AM'),
        isApg: !!day.isApg,
        pickupPoint: day.pickupPoint || '',
        duty: day.duty || day.route || day.description || '',
        description: day.duty || day.route || day.description || 'Standard Duty',
        vehicleType: day.vehicleType || carType || '',
        vehicleCount: Number(day.vehicleCount || day.quantity) || 1,
        rate: Number(day.rate) || 0,
        amount: Number(day.amount) || ((Number(day.rate) || 0) * (Number(day.vehicleCount || day.quantity) || 1)),
        estimatedKm: Number(day.estimatedKm) || 0,
        estimatedHours: Number(day.estimatedHours) || 0,
        inclusions: day.inclusions || '',
        exclusions: day.exclusions || '',
        specialNotes: day.specialNotes || ''
    }));

    const lead = await Lead.create({
        clientCode,
        leadId,
        company,
        bookingReference: finalBookingRef,
        travelAgent: travelAgent || null,
        travelAgentName: travelAgentName || '',
        travelAgentMobile: travelAgentMobile || '',
        clientName: finalClientName,
        mobileNumber: finalMobile,
        alternateMobile,
        email,
        gstin,
        source: source || 'Website',
        reference,
        salesPerson: salesPerson || (req.user ? req.user.name : ''),
        salesUser: req.user ? req.user._id : null,
        leadDate: leadDate || Date.now(),
        travelStartDate,
        travelEndDate,
        isBreakTour: Boolean(isBreakTour) || (Array.isArray(excludedDates) && excludedDates.length > 0),
        excludedDates: Array.isArray(excludedDates) ? excludedDates : [],
        activeDaysCount: Number(activeDaysCount) || 0,
        carType,
        numberOfCars: Number(numberOfCars) || 1,
        itinerary: formattedItinerary,
        extraCharges: extraCharges || [],
        totalAmount: Number(totalAmount) || 0,
        advanceDate: advanceDate || null,
        gstMode: gstMode || 'GST Inclusive',
        gstRate: Number(gstRate) || 5,
        priority: (() => {
            if (priority === 'Lost' || req.body.status === 'Lost' || req.body.status === 'Cancelled') return 'Lost';
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const end = travelEndDate ? new Date(travelEndDate) : (travelStartDate ? new Date(travelStartDate) : null);
            if (end) end.setHours(23, 59, 59, 999);
            if (end && end < now) return 'Lost';
            return priority || 'Unassigned';
        })(),
        status: (() => {
            if (priority === 'Lost' || req.body.status === 'Lost' || req.body.status === 'Cancelled') return 'Lost';
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const end = travelEndDate ? new Date(travelEndDate) : (travelStartDate ? new Date(travelStartDate) : null);
            if (end) end.setHours(23, 59, 59, 999);
            return (end && end < now) ? 'Lost' : 'New';
        })(),
        remarksHistory: (() => {
            if (priority === 'Lost' || req.body.status === 'Lost') return [];
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const end = travelEndDate ? new Date(travelEndDate) : (travelStartDate ? new Date(travelStartDate) : null);
            if (end) end.setHours(23, 59, 59, 999);
            return (end && end < now) ? [{ text: 'Tour date passed without confirmation (Auto-moved to Lost)', date: new Date() }] : [];
        })(),
        notes,
        specialRemarks: specialRemarks || '',
        vehicleMatrix: req.body.vehicleMatrix || {},
        inclusions: inclusions || {
            driverAllowance: true,
            nightAllowance: true,
            tollParking: true,
            gstIncluded: true,
            manualRemarks: ''
        }
    });

    res.status(201).json(lead);
});

// @desc    Update a lead
// @route   PUT /api/leads/single/:id
// @access  Private/AdminOrExecutive
const updateLead = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    // Clean empty strings for ObjectId fields to prevent CastError
    ['travelAgent', 'salesUser', 'bookingRef'].forEach(field => {
        if (field in req.body) {
            if (req.body[field] === '' || req.body[field] === 'null' || !req.body[field]) {
                req.body[field] = null;
            }
        }
    });

    if (req.body.itinerary) {
        req.body.itinerary = req.body.itinerary.map((day, idx) => ({
            ...day,
            dayNo: day.dayNo || (idx + 1),
            rate: Number(day.rate) || 0,
            amount: Number(day.amount) || ((Number(day.rate) || 0) * (Number(day.vehicleCount || day.quantity) || 1)),
            vehicleCount: Number(day.vehicleCount || day.quantity) || 1,
            duty: day.duty || day.route || day.description || '',
            description: day.duty || day.route || day.description || 'Standard Duty'
        }));
    }

    if (req.body.totalAmount !== undefined) {
        req.body.totalAmount = Number(req.body.totalAmount) || 0;
    }

    // Preserve advanceDate on confirmed leads so rate revisions never wipe out conversion dates
    if (!req.body.advanceDate && lead.advanceDate) {
        delete req.body.advanceDate;
    }

    if (req.body.priority === 'Lost' || req.body.status === 'Lost' || req.body.status === 'Cancelled') {
        req.body.priority = 'Lost';
        req.body.status = 'Lost';
    } else if (req.body.priority && req.body.priority !== 'Lost' && (lead.status === 'Lost' || lead.status === 'Cancelled' || lead.priority === 'Lost')) {
        if (!lead.bookingId && !lead.bookingRef) {
            req.body.status = 'New';
        }
    }

    const isAlreadyConfirmed = lead.status === 'Confirmed' || lead.status === 'Converted' || Boolean(lead.bookingRef || lead.bookingId);
    const updatedLead = await Lead.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true, timestamps: !isAlreadyConfirmed }
    );

    // If this lead is already converted to a Booking, sync revised package rates/details to the Booking
    if (isAlreadyConfirmed && updatedLead) {
        try {
            const bkgMatch = {
                $or: [
                    ...(updatedLead.bookingRef ? [{ _id: updatedLead.bookingRef }] : []),
                    { lead: updatedLead._id },
                    ...(updatedLead.bookingId ? [{ bookingId: updatedLead.bookingId }] : []),
                    ...(updatedLead.clientCode ? [{ clientCode: updatedLead.clientCode }, { bookingId: updatedLead.clientCode }] : [])
                ]
            };
            const linkedBkg = await Booking.findOne(bkgMatch);
            if (linkedBkg) {
                if (req.body.totalAmount !== undefined && Number(req.body.totalAmount) > 0) {
                    linkedBkg.totalAmount = Number(req.body.totalAmount);
                    const fuelDed = linkedBkg.guestFuelFilled ? (Number(linkedBkg.guestFuelAmount) || 0) : 0;
                    linkedBkg.balanceDue = Math.max(0, linkedBkg.totalAmount - (Number(linkedBkg.advancePaid) || 0) - fuelDed);
                    linkedBkg.paymentStatus = linkedBkg.balanceDue <= 0 ? 'Full Received' : (((Number(linkedBkg.advancePaid) || 0) + fuelDed) > 0 ? 'Partial' : 'Pending');
                }
                if (req.body.clientName) linkedBkg.clientName = req.body.clientName;
                if (req.body.mobileNumber) linkedBkg.mobileNumber = req.body.mobileNumber;
                if (req.body.travelStartDate) linkedBkg.travelStartDate = req.body.travelStartDate;
                if (req.body.travelEndDate) linkedBkg.travelEndDate = req.body.travelEndDate;
                if (req.body.carType) linkedBkg.vehicleType = req.body.carType;
                if (req.body.vehicleMatrix) linkedBkg.vehicleMatrix = req.body.vehicleMatrix;
                if (Array.isArray(req.body.itinerary) && req.body.itinerary.length > 0) {
                    const existingItin = Array.isArray(linkedBkg.itinerary) ? linkedBkg.itinerary : [];
                    linkedBkg.itinerary = req.body.itinerary.map((d, idx) => {
                        const prev = existingItin.find(e => Number(e.day) === Number(d.day)) || existingItin[idx] || {};
                        const prevObj = prev.toObject ? prev.toObject() : prev;
                        return {
                            ...prevObj,
                            ...d,
                            driverId: d.driverId || prevObj.driverId || null,
                            driverName: d.driverName || prevObj.driverName || '',
                            driverPhone: d.driverPhone || prevObj.driverPhone || '',
                            vehicleId: d.vehicleId || prevObj.vehicleId || null,
                            vehicleNumber: d.vehicleNumber || prevObj.vehicleNumber || ''
                        };
                    });
                }
                await linkedBkg.save({ validateBeforeSave: false });
            }
        } catch (syncBkgErr) {
            console.error('Error syncing lead rate revision to booking:', syncBkgErr);
        }
    }

    res.json(updatedLead);
});

// @desc    Delete a lead
// @route   DELETE /api/leads/single/:id
// @access  Private/AdminOrExecutive
const deleteLead = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    // If confirmed or has linked booking/duties, cascade clean them up
    try {
        if (lead.bookingRef || lead.status === 'Confirmed') {
            await Booking.deleteMany({ $or: [{ lead: lead._id }, { _id: lead.bookingRef }] });
            await DRSDuty.deleteMany({ leadId: lead._id });
            await LedgerEntry.deleteMany({ referenceId: lead._id });
        }
        await removeFinancialTransaction({ sourceId: lead._id });
    } catch (cleanupErr) {
        console.error('Error cleaning up associated lead records:', cleanupErr);
    }

    await lead.deleteOne();
    res.json({ message: 'Lead removed successfully' });
});

// @desc    Convert lead to booking (Creates Booking, DRS entries, and ledger records)
// @route   POST /api/leads/:id/convert
// @access  Private/AdminOrExecutive
const convertToBooking = asyncHandler(async (req, res) => {
    const {
        advancePayment, advancePaymentDate, paymentMode, paymentReference, termsAndConditions,
        notes, adminOverrideReason, bankAccountId, paymentScreenshot
    } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    if (lead.status === 'Confirmed') {
        res.status(400);
        throw new Error('Lead is already confirmed');
    }

    const advance = Number(advancePayment) || 0;
    if (advance <= 0 && !adminOverrideReason) {
        res.status(400);
        throw new Error('Advance payment or admin override reason is required to confirm booking');
    }

    // 1. Generate unique sequential Booking ID (e.g. LK-BKG-2026-00001)
    let bookingId = lead.clientCode;
    if (!bookingId) {
        bookingId = await getNextSequence('LK-BKG');
    }

    // 2. Determine GST breakdown based on GST mode and lead/company settings
    const companyData = await Company.findById(lead.company);
    const gstRate = Number(lead.gstRate) || companyData?.gstRate || 5;
    let taxableAmount = 0;
    let gstAmount = 0;
    const totalFare = Number(lead.totalAmount) || 0;

    if (lead.gstMode === 'GST Extra') {
        taxableAmount = totalFare;
        gstAmount = Number(((totalFare * gstRate) / 100).toFixed(2));
    } else if (lead.gstMode === 'GST Inclusive') {
        taxableAmount = Number((totalFare / (1 + (gstRate / 100))).toFixed(2));
        gstAmount = Number((totalFare - taxableAmount).toFixed(2));
    } else {
        // No GST or RCM
        taxableAmount = totalFare;
        gstAmount = 0;
    }

    const grandTotal = lead.gstMode === 'GST Extra' ? (totalFare + gstAmount) : totalFare;
    const balanceDue = grandTotal - advance;

    // 3. Client & Ledger Records (Support Travel Agent vs Direct Client)
    let client = null;
    if (lead.bookingReference === 'Travel Agent' && lead.travelAgent) {
        client = await Client.findById(lead.travelAgent);
    }
    if (!client && lead.mobileNumber && lead.mobileNumber !== 'TBA') {
        client = await Client.findOne({ company: lead.company, mobile: lead.mobileNumber });
    }

    if (!client) {
        const isAgent = lead.bookingReference === 'Travel Agent';
        client = await Client.create({
            company: lead.company,
            name: isAgent ? (lead.travelAgentName || lead.clientName) : lead.clientName,
            mobile: (lead.mobileNumber && lead.mobileNumber !== 'TBA') ? lead.mobileNumber : `AGENT-${Date.now().toString().slice(-6)}`,
            clientType: isAgent ? 'Travel Agent' : 'Direct',
            agencyName: isAgent ? (lead.travelAgentName || '') : '',
            totalBilled: grandTotal,
            totalPaid: advance,
            balance: balanceDue
        });
    } else {
        client.totalBilled += grandTotal;
        client.totalPaid += advance;
        client.balance += balanceDue;
        await client.save();
    }

    // Create Bill Entry in Client / Agent Ledger
    const billDesc = lead.bookingReference === 'Travel Agent'
        ? `Booking Confirmed (${bookingId}) - Agent: ${lead.travelAgentName || client.name} (Guest: ${lead.clientName})`
        : `Booking Confirmed (${bookingId}) - ${lead.clientName}`;

    await LedgerEntry.create({
        client: client._id,
        company: lead.company,
        type: 'Bill',
        amount: grandTotal,
        taxableAmount,
        gstAmount,
        description: billDesc,
        referenceId: lead._id
    });

    // Record into Cash Book or Bank Book & Create Advance Payment Entry if paid
    let bank = null;
    if (advance > 0) {
        const isCash = (
            paymentMode === 'Cash' ||
            paymentMode === 'Driver Cash' ||
            paymentMode === 'Cash to Company' ||
            (paymentMode && paymentMode.toLowerCase().includes('cash'))
        );

        if (!isCash && bankAccountId) {
            bank = await BankAccount.findById(bankAccountId);
        }

        const effectiveModeLabel = isCash ? 'Cash' : (bank?.bankName || paymentMode || 'Cash');

        await LedgerEntry.create({
            client: client._id,
            company: lead.company,
            type: 'Advance',
            amount: advance,
            date: advancePaymentDate ? new Date(advancePaymentDate) : new Date(),
            description: `Advance received for Booking ${bookingId} via ${effectiveModeLabel} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
            referenceId: lead._id,
            bankName: isCash ? 'Cash' : (bank?.bankName || ''),
            paymentMode: effectiveModeLabel
        });

        if (isCash) {
            try {
                await CashTransaction.create({
                    company: lead.company,
                    type: 'IN',
                    amount: advance,
                    category: 'Booking Advance',
                    reference: paymentReference || '',
                    receiptPhoto: paymentScreenshot || '',
                    description: `Advance Payment Received - ${lead.clientName}`,
                    leadRef: lead._id,
                    clientRef: client._id,
                    guestName: lead.clientName || '',
                    sourceId: lead._id,
                    sourceType: 'LeadAdvance',
                    date: advancePaymentDate ? new Date(advancePaymentDate) : new Date(),
                    createdBy: req.user ? req.user._id : null
                });
                await Company.findByIdAndUpdate(lead.company, {
                    $inc: { cashBalance: advance }
                });
            } catch (cashErr) {
                console.error('Error creating cash transaction for advance:', cashErr);
            }
        } else if (bank) {
            await BankTransaction.create({
                company: lead.company,
                bankAccount: bank._id,
                bankName: bank.bankName,
                type: 'IN',
                amount: advance,
                category: 'Booking Advance',
                paymentMode: paymentMode || 'UPI / QR Code',
                reference: paymentReference || '',
                paymentScreenshot: paymentScreenshot || '',
                description: `Advance Payment Received - ${lead.clientName}`,
                leadRef: lead._id,
                clientRef: client._id,
                sourceId: lead._id,
                sourceType: 'LeadAdvance',
                date: advancePaymentDate ? new Date(advancePaymentDate) : new Date(),
                createdBy: req.user ? req.user._id : null
            });
            bank.currentBalance += advance;
            await bank.save();
        }
    }

    // 4. Do NOT auto-create Live DRS (DRSDuty) entries here.
    // Live DRS entries are ONLY created when the user completes "Assign Drivers & Vehicles" in Confirmed Bookings.
    const drsEntries = [];

    const isAgent = lead.bookingReference === 'Travel Agent' || lead.source === 'Agent';
    const agentName = lead.travelAgentName || (client && client.clientType === 'Travel Agent' ? (client.agencyName || client.name) : '');
    const agentMob = lead.travelAgentMobile || (client && client.clientType === 'Travel Agent' ? client.mobile : '');

    // 5. Create the Booking document
    const booking = await Booking.create({
        bookingId,
        clientCode: lead.clientCode || lead.leadId,
        company: lead.company,
        lead: lead._id,
        client: client._id,
        salesPerson: lead.salesPerson,
        source: lead.source || lead.reference || 'Direct',
        bookingReference: isAgent ? 'Travel Agent' : (lead.bookingReference || 'Direct'),
        travelAgent: lead.travelAgent || null,
        travelAgentName: agentName,
        travelAgentMobile: agentMob,
        bankAccount: bank ? bank._id : null,
        bankName: bank ? bank.bankName : '',
        paymentMode: paymentMode || '',
        paymentReference: paymentReference || '',
        paymentScreenshot: paymentScreenshot || '',
        clientName: lead.clientName,
        mobileNumber: lead.mobileNumber,
        alternateMobile: lead.alternateMobile,
        email: lead.email,
        gstin: lead.gstin,
        bookingDate: new Date(),
        travelStartDate: lead.travelStartDate,
        travelEndDate: lead.travelEndDate,
        isBreakTour: lead.isBreakTour || (Array.isArray(lead.excludedDates) && lead.excludedDates.length > 0),
        excludedDates: lead.excludedDates || [],
        activeDaysCount: lead.activeDaysCount || 0,
        vehicleType: lead.carType,
        numberOfCars: lead.numberOfCars,
        itinerary: lead.itinerary || [],
        totalAmount: grandTotal,
        advancePaid: advance, advanceDate: advancePaymentDate || new Date(),
        paymentMode: paymentMode || 'UPI / QR Code',
        paymentReference: paymentReference || '',
        balanceDue: balanceDue,
        gstMode: lead.gstMode,
        gstRate,
        taxableAmount,
        gstAmount,
        bookingStatus: (() => {
            const effEnd = lead.travelEndDate || lead.travelStartDate;
            if (effEnd) {
                const endD = new Date(effEnd);
                endD.setHours(0, 0, 0, 0);
                const todayD = new Date();
                todayD.setHours(0, 0, 0, 0);
                if (endD < todayD) return 'Completed';
            }
            return 'Confirmed';
        })(),
        paymentStatus: advance >= grandTotal ? 'Full Received' : (advance > 0 ? 'Advance Received' : 'No Advance'),
        vehicleMatrix: lead.vehicleMatrix || {},
        termsAndConditions: termsAndConditions || [
            'All rates are strictly subject to vehicle availability at the time of confirmation.',
            'Toll, Tax, Parking, State Border Tax will be charged on actuals unless explicitly mentioned.',
            'Air conditioner will not work in stationary/parked vehicle or uphill driving.',
            'Night driving charge applies between 10:00 PM and 06:00 AM.'
        ],
        notes: notes || adminOverrideReason || '',
        drsDuties: []
    });

    // Link bookingRef to BankTransaction / CashTransaction if created
    if (advance > 0) {
        if (bank) {
            await BankTransaction.updateMany({ leadRef: lead._id, bookingRef: null }, { bookingRef: booking._id });
        }
        await CashTransaction.updateMany(
            { leadRef: lead._id, bookingRef: null },
            { bookingRef: booking._id, bookingId: booking.bookingCode || booking.bookingId || '' }
        );
    }

    // 6. Update lead status and reference
    lead.status = 'Confirmed';
    lead.advancePayment = advance;
    lead.advanceDate = advancePaymentDate || new Date();
    lead.bookingId = bookingId;
    lead.bookingRef = booking._id;
    await lead.save();

    res.json({
        message: 'Booking confirmed successfully',
        clientCode: lead.clientCode || lead.leadId,
        bookingId: bookingId,
        booking,
        lead,
        createdDutiesCount: 0
    });
});

// @desc    Add a remark to a lead
// @route   POST /api/leads/:id/remarks
// @access  Private/Admin
const addLeadRemark = asyncHandler(async (req, res) => {
    const { text, attachmentUrl } = req.body;
    
    if (!text) {
        return res.status(400).json({ message: 'Remark text is required' });
    }

    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
    }

    lead.remarksHistory.push({
        text,
        attachmentUrl: attachmentUrl || null,
        date: new Date()
    });

    await lead.save();
    res.status(201).json(lead);
});

module.exports = {
    getLeads,
    checkDuplicatePhone,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    convertToBooking,
    getNextClientCodePreview,
    addLeadRemark
};
