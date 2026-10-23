const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const Company = require('../models/Company');
const { getNextSequence } = require('../models/Sequence');

// Helper to round currency
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

/**
 * Re-sequences all invoices for a company strictly in chronological order of invoiceDate.
 * If invoice dates are equal, secondary sort is by createdAt.
 * Earlier dates receive smaller invoice numbers.
 */
const resequenceCompanyInvoices = async (companyId) => {
    try {
        if (!companyId) return;
        const allInvoices = await Invoice.find({ company: companyId })
            .sort({ invoiceDate: 1, createdAt: 1 });

        if (!allInvoices || allInvoices.length === 0) return;

        // Check if there is an invoice ending with -00001
        let minSeq = 2; // Default starting sequence is 2 (e.g. LK-INV-2026-00002)
        if (allInvoices.some(inv => inv.invoiceNumber && inv.invoiceNumber.endsWith('-00001'))) {
            minSeq = 1;
        }

        // Pass 1: Assign temporary numbers to avoid MongoDB unique index conflict
        let anyChanged = false;
        for (let i = 0; i < allInvoices.length; i++) {
            const inv = allInvoices[i];
            const targetSeq = minSeq + i;
            const year = inv.invoiceDate ? new Date(inv.invoiceDate).getFullYear() : new Date().getFullYear();
            const formattedSeq = `LK-INV-${year}-${String(targetSeq).padStart(5, '0')}`;
            if (inv.invoiceNumber !== formattedSeq) {
                anyChanged = true;
                await Invoice.findByIdAndUpdate(inv._id, { invoiceNumber: `LK-TEMP-${inv._id}` });
            }
        }

        if (!anyChanged) return;

        // Pass 2: Assign final formatted numbers
        for (let i = 0; i < allInvoices.length; i++) {
            const inv = allInvoices[i];
            const targetSeq = minSeq + i;
            const year = inv.invoiceDate ? new Date(inv.invoiceDate).getFullYear() : new Date().getFullYear();
            const formattedSeq = `LK-INV-${year}-${String(targetSeq).padStart(5, '0')}`;
            const oldNumber = inv.invoiceNumber;

            if (oldNumber !== formattedSeq) {
                await Invoice.findByIdAndUpdate(inv._id, { invoiceNumber: formattedSeq });

                // Update linked booking notes if it contains the old invoice number
                if (inv.booking) {
                    const bkg = await Booking.findById(inv.booking);
                    if (bkg && bkg.notes && oldNumber && bkg.notes.includes(oldNumber)) {
                        bkg.notes = bkg.notes.replace(oldNumber, formattedSeq);
                        await bkg.save();
                    }
                }

                // Update ledger entries referencing this invoice
                await LedgerEntry.updateMany(
                    { referenceId: inv._id, type: 'Bill' },
                    { description: `Tax Invoice ${formattedSeq} issued for ${inv.billTo?.name || 'Guest'}` }
                );
            }
        }

        // Keep Sequence model synced to highest sequence
        const { Sequence } = require('../models/Sequence');
        const maxSeq = minSeq + allInvoices.length - 1;
        await Sequence.findOneAndUpdate(
            { id: `LK-INV-${new Date().getFullYear()}` },
            { $set: { seq: maxSeq } },
            { upsert: true }
        );
    } catch (reseqErr) {
        console.error('Error re-sequencing invoices chronologically:', reseqErr);
    }
};

// @desc    Create a new Tax Invoice
// @route   POST /api/invoices
// @access  Private/AdminOrExecutive
const createInvoice = asyncHandler(async (req, res) => {
    const {
        company,
        booking: bookingRef,
        bookingId,
        billTo,
        items,
        sacCode = '996601',
        salesLedger = 'Taxi Sales',
        gstMode = 'GST Extra',
        gstRate = 5,
        isInterState = false,
        advanceAdjusted = 0,
        invoiceDate,
        dueDate,
        termsAndConditions,
        notes,
        status = 'Issued',
        paymentDetails
    } = req.body;

    const companyId = company || req.user?.company;
    if (!companyId) {
        res.status(400);
        throw new Error('Company ID is required');
    }

    if (!billTo || !billTo.name || !billTo.mobile) {
        res.status(400);
        throw new Error('Bill To Name and Mobile Number are required');
    }

    if (!items || !items.length) {
        res.status(400);
        throw new Error('At least one invoice line item is required');
    }

    // 1. Generate sequential Tax Invoice Number (e.g. LK-INV-2026-00001)
    const invoiceNumber = await getNextSequence('LK-INV');

    // 2. Format line items & calculate base sum
    const formattedItems = items.map(item => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.rate) || 0;
        const amount = item.amount !== undefined ? Number(item.amount) : (qty * rate);
        return {
            description: item.description || 'Passenger Transport Service',
            sacCode: item.sacCode || sacCode,
            quantity: qty,
            rate,
            amount: round2(amount)
        };
    });

    const itemSum = round2(formattedItems.reduce((acc, curr) => acc + curr.amount, 0));

    // 3. Dynamic GST Calculations (PRD Section 14)
    const rateNum = Number(gstRate) || 0;
    let taxableAmount = 0;
    let totalTaxAmount = 0;
    let totalAmount = 0;

    if (gstMode === 'GST Extra') {
        taxableAmount = itemSum;
        totalTaxAmount = round2((taxableAmount * rateNum) / 100);
        totalAmount = round2(taxableAmount + totalTaxAmount);
    } else if (gstMode === 'GST Inclusive') {
        totalAmount = itemSum;
        taxableAmount = round2(totalAmount / (1 + (rateNum / 100)));
        totalTaxAmount = round2(totalAmount - taxableAmount);
    } else {
        // No GST or RCM
        taxableAmount = itemSum;
        totalTaxAmount = 0;
        totalAmount = itemSum;
    }

    // 4. Split CGST/SGST (Intra-state) or IGST (Inter-state)
    let cgstRate = 0, cgstAmount = 0;
    let sgstRate = 0, sgstAmount = 0;
    let igstRate = 0, igstAmount = 0;

    if (totalTaxAmount > 0) {
        if (isInterState) {
            igstRate = rateNum;
            igstAmount = totalTaxAmount;
        } else {
            cgstRate = round2(rateNum / 2);
            sgstRate = round2(rateNum / 2);
            cgstAmount = round2(totalTaxAmount / 2);
            sgstAmount = round2(totalTaxAmount - cgstAmount); // Guard against 1-cent rounding diff
        }
    }

    const advanceNum = round2(Number(advanceAdjusted) || 0);
    const netPayable = Math.max(0, round2(totalAmount - advanceNum));

    // 5. Check/Update Client & Ledger
    let clientRecord = null;
    if (billTo.mobile) {
        clientRecord = await Client.findOne({ company: companyId, mobile: billTo.mobile });
        if (!clientRecord) {
            clientRecord = await Client.create({
                company: companyId,
                name: billTo.name,
                mobile: billTo.mobile,
                gstNumber: billTo.gstin || '',
                address: billTo.address || '',
                totalBilled: totalAmount,
                totalPaid: advanceNum,
                balance: netPayable
            });
        } else {
            // Update client billing details
            if (billTo.gstin && !clientRecord.gstNumber) clientRecord.gstNumber = billTo.gstin;
            if (billTo.address && !clientRecord.address) clientRecord.address = billTo.address;
            clientRecord.totalBilled = round2(clientRecord.totalBilled + totalAmount);
            clientRecord.totalPaid = round2(clientRecord.totalPaid + advanceNum);
            clientRecord.balance = round2(clientRecord.totalBilled - clientRecord.totalPaid);
            await clientRecord.save();
        }
    }

    // 6. Create Invoice
    const invoice = await Invoice.create({
        invoiceNumber,
        company: companyId,
        booking: bookingRef || null,
        bookingId: bookingId || '',
        client: clientRecord ? clientRecord._id : null,
        billTo: {
            name: billTo.name,
            companyName: billTo.companyName || '',
            mobile: billTo.mobile,
            email: billTo.email || '',
            address: billTo.address || '',
            gstin: billTo.gstin || '',
            placeOfSupply: billTo.placeOfSupply || 'Rajasthan',
            stateCode: billTo.stateCode || '08'
        },
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        salesLedger,
        items: formattedItems,
        sacCode,
        taxableAmount,
        gstMode,
        gstRate: rateNum,
        isInterState,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalTaxAmount,
        totalAmount,
        advanceAdjusted: advanceNum,
        netPayable,
        status,
        paymentDetails: paymentDetails || undefined,
        termsAndConditions: termsAndConditions || [
            'All disputes are subject to Jaipur jurisdiction only.',
            'Payment is strictly due within the payment terms mentioned.',
            'Toll taxes, parking charges, and border entry taxes are extra if not specified.',
            'This is a computer generated invoice and does not require physical signature.'
        ],
        notes: notes || '',
        createdBy: req.user?.name || 'Admin'
    });

    // 7. Record Ledger Entry for this Tax Invoice
    if (clientRecord && status !== 'Draft') {
        await LedgerEntry.create({
            client: clientRecord._id,
            company: companyId,
            type: 'Bill',
            amount: totalAmount,
            taxableAmount,
            gstAmount: totalTaxAmount,
            description: `Tax Invoice ${invoiceNumber} issued for ${billTo.name}`,
            referenceId: invoice._id
        });
    }

    // 8. Update linked Booking without removing it from Completed Bookings
    if (bookingRef) {
        const existingBkg = await Booking.findById(bookingRef);
        if (existingBkg) {
            await Booking.findByIdAndUpdate(bookingRef, {
                invoiceGenerated: true,
                notes: existingBkg.notes
                    ? (existingBkg.notes.includes(invoiceNumber) ? existingBkg.notes : `${existingBkg.notes} | Invoiced: ${invoiceNumber}`)
                    : `Invoiced: ${invoiceNumber}`
            });
        }
    } else if (bookingId) {
        await Booking.findOneAndUpdate(
            { $or: [{ bookingId }, { clientCode: bookingId }] },
            { invoiceGenerated: true }
        );
    }

    await resequenceCompanyInvoices(companyId);
    const finalizedInvoice = await Invoice.findById(invoice._id);
    res.status(201).json(finalizedInvoice || invoice);
});

// Helper: Automatically create or update a Paid Tax Invoice when a booking's payment is settled (balanceDue <= 0)
// opts.force = true -> generate an invoice even if balance is still pending (status 'Issued')
const syncInvoiceForBooking = async (booking, opts = {}) => {
    try {
        const force = Boolean(opts.force);
        if (!booking || booking.bookingStatus === 'Cancelled') return null;
        const pkgAmt = round2(Number(booking.totalAmount || booking.packagePrice) || 0);
        if (pkgAmt <= 0) return null;

        const advAmt = round2(Number(booking.advancePaid) || 0);
        const balAmt = booking.balanceDue !== undefined
            ? Math.max(0, round2(Number(booking.balanceDue)))
            : Math.max(0, round2(pkgAmt - advAmt));

        const isSettled = !(balAmt > 0 && booking.paymentStatus !== 'Full Received' && advAmt < pkgAmt);
        // Only auto-sync into Tax Invoices when payment is settled (balance is 0)
        if (!isSettled && !force) {
            return null;
        }

        const displayCode = booking.clientCode || booking.bookingId || '';
        const matchOr = [{ booking: booking._id }];
        if (booking.bookingId) matchOr.push({ bookingId: booking.bookingId });
        if (booking.clientCode) matchOr.push({ bookingId: booking.clientCode });

        let existingInvoice = await Invoice.findOne({
            company: booking.company,
            $or: matchOr
        });

        const gstMode = booking.gstMode || 'GST Inclusive';
        const rateNum = Number(booking.gstRate) || 5;
        let taxableAmount = pkgAmt;
        let totalTaxAmount = 0;
        let totalAmount = pkgAmt;

        if (gstMode === 'GST Extra') {
            taxableAmount = pkgAmt;
            totalTaxAmount = round2((taxableAmount * rateNum) / 100);
            totalAmount = round2(taxableAmount + totalTaxAmount);
        } else if (gstMode === 'GST Inclusive') {
            totalAmount = pkgAmt;
            taxableAmount = round2(totalAmount / (1 + (rateNum / 100)));
            totalTaxAmount = round2(totalAmount - taxableAmount);
        }

        const cgstRate = totalTaxAmount > 0 ? round2(rateNum / 2) : 0;
        const sgstRate = totalTaxAmount > 0 ? round2(rateNum / 2) : 0;
        const cgstAmount = totalTaxAmount > 0 ? round2(totalTaxAmount / 2) : 0;
        const sgstAmount = totalTaxAmount > 0 ? round2(totalTaxAmount - cgstAmount) : 0;

        if (existingInvoice && !isSettled) {
            // Forced generation for an unpaid booking: invoice already exists, keep it as-is
            return existingInvoice;
        }

        if (existingInvoice) {
            existingInvoice.booking = booking._id;
            if (displayCode) existingInvoice.bookingId = displayCode;
            existingInvoice.totalAmount = totalAmount;
            existingInvoice.taxableAmount = taxableAmount;
            existingInvoice.totalTaxAmount = totalTaxAmount;
            existingInvoice.cgstRate = cgstRate;
            existingInvoice.cgstAmount = cgstAmount;
            existingInvoice.sgstRate = sgstRate;
            existingInvoice.sgstAmount = sgstAmount;
            existingInvoice.advanceAdjusted = totalAmount;
            existingInvoice.netPayable = 0;
            existingInvoice.status = 'Paid';
            if (booking.clientName) existingInvoice.billTo.name = booking.clientName;
            if (booking.mobileNumber) existingInvoice.billTo.mobile = booking.mobileNumber;
            await existingInvoice.save();
            return existingInvoice;
        }

        const invoiceNumber = await getNextSequence('LK-INV');
        const invDate = booking.travelEndDate || booking.travelStartDate || new Date();
        const pendingAmt = isSettled ? 0 : Math.min(totalAmount, balAmt);
        const adjustedAmt = round2(totalAmount - pendingAmt);

        const newInvoice = await Invoice.create({
            invoiceNumber,
            company: booking.company,
            booking: booking._id,
            bookingId: displayCode,
            client: booking.client || null,
            billTo: {
                name: booking.clientName || 'Valued Guest',
                companyName: '',
                mobile: booking.mobileNumber || 'N/A',
                email: booking.email || '',
                address: booking.pickupLocation || 'Rajasthan',
                gstin: booking.gstin || '',
                placeOfSupply: 'Rajasthan',
                stateCode: '08'
            },
            invoiceDate: new Date(invDate),
            dueDate: new Date(invDate),
            salesLedger: 'Taxi Sales',
            items: [
                {
                    description: `${booking.vehicleType || 'Commercial Vehicle'} Rental & Travel Service (${displayCode})`,
                    sacCode: '996601',
                    quantity: 1,
                    rate: pkgAmt,
                    amount: pkgAmt
                }
            ],
            sacCode: '996601',
            taxableAmount,
            gstMode,
            gstRate: rateNum,
            isInterState: false,
            cgstRate,
            cgstAmount,
            sgstRate,
            sgstAmount,
            igstRate: 0,
            igstAmount: 0,
            totalTaxAmount,
            totalAmount,
            advanceAdjusted: adjustedAmt,
            netPayable: round2(pendingAmt),
            status: isSettled ? 'Paid' : 'Issued',
            notes: isSettled
                ? `Auto-generated Tax Invoice on full payment settlement for booking ${displayCode}`
                : `Tax Invoice generated for booking ${displayCode}`
        });

        await Booking.findByIdAndUpdate(booking._id, {
            invoiceGenerated: true
        });

        await resequenceCompanyInvoices(booking.company);
        const finalized = await Invoice.findById(newInvoice._id);
        return finalized || newInvoice;
    } catch (err) {
        console.error('Error syncing invoice for paid booking:', err);
        return null;
    }
};

// @desc    Generate (or fetch existing) Tax Invoice for a booking
// @route   POST /api/invoices/from-booking/:bookingId
// @access  Private/AdminOrExecutive
const generateInvoiceFromBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }
    if (booking.bookingStatus === 'Cancelled') {
        res.status(400);
        throw new Error('Cannot generate invoice for a cancelled booking');
    }
    if (!(Number(booking.totalAmount || booking.packagePrice) > 0)) {
        res.status(400);
        throw new Error('Booking package amount is 0. Please update the package price first.');
    }
    const invoice = await syncInvoiceForBooking(booking, { force: true });
    if (!invoice) {
        res.status(500);
        throw new Error('Failed to generate invoice');
    }
    res.status(201).json(invoice);
});

// @desc    Get all invoices for a company
// @route   GET /api/invoices/:companyId
// @access  Private/AdminOrExecutive
const getInvoices = asyncHandler(async (req, res) => {
    const { status, search, startDate, endDate, page = 1, limit = 500 } = req.query;
    const companyId = req.params.companyId || req.user?.company;

    // Non-blocking background check so GET response is never delayed
    resequenceCompanyInvoices(companyId).catch((reseqErr) => {
        console.error('Error re-sequencing invoices in getInvoices:', reseqErr);
    });

    const query = { company: companyId };

    if (status && status !== 'All') {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { invoiceNumber: { $regex: search, $options: 'i' } },
            { bookingId: { $regex: search, $options: 'i' } },
            { 'billTo.name': { $regex: search, $options: 'i' } },
            { 'billTo.mobile': { $regex: search, $options: 'i' } },
            { 'billTo.gstin': { $regex: search, $options: 'i' } },
            { 'billTo.companyName': { $regex: search, $options: 'i' } }
        ];
    }

    if (startDate || endDate) {
        query.invoiceDate = {};
        if (startDate) query.invoiceDate.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.invoiceDate.$lte = end;
        }
    }

    const [invoices, total, allMatching] = await Promise.all([
        Invoice.find(query)
            .populate('booking', 'bookingId clientCode travelStartDate travelEndDate vehicleType clientName mobileNumber totalAmount advancePaid balanceDue gstMode gstRate')
            .populate('client', 'name mobile balance')
            .populate('company', 'name gstNumber logoUrl ownerName whatsappNumber')
            .sort({ invoiceDate: -1, invoiceNumber: -1, createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean(),
        Invoice.countDocuments(query),
        Invoice.find({ company: companyId })
            .select('status totalAmount advanceAdjusted netPayable totalTaxAmount')
            .lean()
    ]);

    const kpiSummary = {
        totalInvoices: allMatching.length,
        totalInvoicedAmount: allMatching.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? inv.totalAmount : 0), 0),
        totalCollectedAmount: allMatching.reduce((acc, inv) => {
            if (inv.status === 'Cancelled') return acc;
            if (inv.status === 'Paid') return acc + inv.totalAmount;
            return acc + (inv.advanceAdjusted || 0);
        }, 0),
        totalPendingAmount: allMatching.reduce((acc, inv) => {
            if (inv.status === 'Cancelled' || inv.status === 'Paid') return acc;
            return acc + inv.netPayable;
        }, 0),
        totalGstCollected: allMatching.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? (inv.totalTaxAmount || 0) : 0), 0)
    };

    res.json({
        invoices,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        kpiSummary
    });
});

// @desc    Get single invoice by ID
// @route   GET /api/invoices/single/:id
// @access  Private/AdminOrExecutive
const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('company')
        .populate('booking')
        .populate('client')
        .lean();

    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    res.json(invoice);
});

// @desc    Update invoice status (Issued, Paid, Cancelled)
// @route   PUT /api/invoices/:id/status
// @access  Private/AdminOrExecutive
const updateInvoiceStatus = asyncHandler(async (req, res) => {
    const { status, paymentMode, paymentReference, notes } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    const prevStatus = invoice.status;
    invoice.status = status;
    if (notes) {
        invoice.notes = `${invoice.notes ? invoice.notes + ' | ' : ''}${notes}`;
    }

    await invoice.save();

    // If marked Paid and was previously not paid, update client ledger
    if (status === 'Paid' && prevStatus !== 'Paid' && invoice.client) {
        const client = await Client.findById(invoice.client);
        if (client) {
            client.totalPaid = round2(client.totalPaid + invoice.netPayable);
            client.balance = Math.max(0, round2(client.totalBilled - client.totalPaid));
            await client.save();

            await LedgerEntry.create({
                client: client._id,
                company: invoice.company,
                type: 'Payment',
                amount: invoice.netPayable,
                description: `Full payment received for Invoice ${invoice.invoiceNumber} via ${paymentMode || 'Bank Transfer'} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
                referenceId: invoice._id
            });
        }
    }

    // If cancelled, record reversal
    if (status === 'Cancelled' && prevStatus !== 'Cancelled' && invoice.client) {
        const client = await Client.findById(invoice.client);
        if (client) {
            client.totalBilled = Math.max(0, round2(client.totalBilled - invoice.totalAmount));
            client.balance = Math.max(0, round2(client.totalBilled - client.totalPaid));
            await client.save();
        }
    }

    res.json({ message: `Invoice status updated to ${status}`, invoice });
});

// @desc    Delete draft invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
const deleteInvoice = asyncHandler(async (req, res) => {
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }
    
    // Remove link from Booking if exists
    if (invoice.booking) {
        const Booking = require('../models/Booking');
        await Booking.findByIdAndUpdate(invoice.booking, { $unset: { taxInvoiceId: "" } });
    }
    
    // Request 3: Delete Client Ledger & Payment entries if invoice deleted
    if (invoice.booking) {
        const LedgerEntry = require('../models/LedgerEntry');
        const BankTransaction = require('../models/BankTransaction');
        
        // Delete all LedgerEntries linked to this booking except Fuel
        await LedgerEntry.deleteMany({ referenceId: invoice.booking, type: { $ne: 'Fuel' } });
        
        // Also delete BankTransactions linked to this booking
        await BankTransaction.deleteMany({ bookingRef: invoice.booking });
        
        // Also update the booking advancePaid to 0
        const Booking = require('../models/Booking');
        await Booking.findByIdAndUpdate(invoice.booking, { advancePaid: 0 });
    }

    await invoice.deleteOne();
    await resequenceCompanyInvoices(invoice.company);
    res.json({ message: 'Invoice removed successfully' });

});


// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private/AdminOrExecutive
const updateInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }
    
    if (req.body.billTo) invoice.billTo = { ...(invoice.billTo?.toObject ? invoice.billTo.toObject() : invoice.billTo), ...req.body.billTo };
    if (req.body.invoiceDate) invoice.invoiceDate = new Date(req.body.invoiceDate);
    if (req.body.notes !== undefined) invoice.notes = req.body.notes;

    const gstChanged = (req.body.gstMode && req.body.gstMode !== invoice.gstMode) ||
        (req.body.gstRate !== undefined && Number(req.body.gstRate) !== Number(invoice.gstRate));
    if (req.body.gstMode) invoice.gstMode = req.body.gstMode;
    if (req.body.gstRate !== undefined) invoice.gstRate = Number(req.body.gstRate) || 0;

    if (gstChanged) {
        const base = round2((invoice.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0) || Number(invoice.taxableAmount) || 0);
        const rateNum = Number(invoice.gstRate) || 0;
        let taxableAmount = base, totalTaxAmount = 0, totalAmount = base;
        if (invoice.gstMode === 'GST Extra') {
            totalTaxAmount = round2((base * rateNum) / 100);
            totalAmount = round2(base + totalTaxAmount);
        } else if (invoice.gstMode === 'GST Inclusive') {
            taxableAmount = round2(base / (1 + rateNum / 100));
            totalTaxAmount = round2(base - taxableAmount);
        }
        invoice.taxableAmount = taxableAmount;
        invoice.totalTaxAmount = totalTaxAmount;
        invoice.totalAmount = totalAmount;
        if (invoice.isInterState) {
            invoice.igstRate = totalTaxAmount > 0 ? rateNum : 0;
            invoice.igstAmount = totalTaxAmount;
            invoice.cgstRate = invoice.sgstRate = invoice.cgstAmount = invoice.sgstAmount = 0;
        } else {
            invoice.cgstRate = totalTaxAmount > 0 ? round2(rateNum / 2) : 0;
            invoice.sgstRate = invoice.cgstRate;
            invoice.cgstAmount = totalTaxAmount > 0 ? round2(totalTaxAmount / 2) : 0;
            invoice.sgstAmount = round2(totalTaxAmount - invoice.cgstAmount);
            invoice.igstRate = invoice.igstAmount = 0;
        }
        if (invoice.status === 'Paid') {
            invoice.advanceAdjusted = totalAmount;
            invoice.netPayable = 0;
        } else {
            invoice.netPayable = Math.max(0, round2(totalAmount - (Number(invoice.advanceAdjusted) || 0)));
        }
    }
    
    await invoice.save();
    await resequenceCompanyInvoices(invoice.company);
    const refreshed = await Invoice.findById(invoice._id) || invoice;
    res.json(refreshed);
});

module.exports = {
    updateInvoice,
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoiceStatus,
    deleteInvoice,
    syncInvoiceForBooking,
    generateInvoiceFromBooking
};
