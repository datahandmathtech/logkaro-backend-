const asyncHandler = require('express-async-handler');
const CashTransaction = require('../models/CashTransaction');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const Company = require('../models/Company');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const { DateTime } = require('luxon');

// @desc    Get all cash transactions with stats
// @route   GET /api/cash/company/:companyId
// @access  Private
const getCashTransactions = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { date, month, year, search, category } = req.query;

    let query = { company: companyId };

    if (date) {
        const startOfDay = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
        const endOfDay = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
        query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (month && year) {
        const m = parseInt(month);
        const y = parseInt(year);
        const startDate = DateTime.fromObject({ year: y, month: m, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month').toJSDate();
        const endDate = DateTime.fromObject({ year: y, month: m, day: 1 }, { zone: 'Asia/Kolkata' }).endOf('month').toJSDate();
        query.date = { $gte: startDate, $lte: endDate };
    }

    if (category && category !== 'all') {
        query.category = category;
    }

    if (search) {
        query.$or = [
            { description: { $regex: search, $options: 'i' } },
            { reference: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { guestName: { $regex: search, $options: 'i' } },
            { driverName: { $regex: search, $options: 'i' } },
            { bankName: { $regex: search, $options: 'i' } }
        ];
    }

    const transactions = await CashTransaction.find(query)
        .populate('bankAccount', 'bankName accountNumber')
        .populate('bookingRef', 'bookingId clientCode clientName')
        .populate('driverRef', 'name mobile')
        .populate('createdBy', 'name')
        .sort({ date: -1, createdAt: -1 });

    let totalIn = 0;
    let totalOut = 0;
    for (const tx of transactions) {
        if (tx.type === 'IN') totalIn += tx.amount;
        else if (tx.type === 'OUT') totalOut += tx.amount;
    }

    // Company current cash in hand balance
    const company = await Company.findById(companyId);
    let cashBalance = company?.cashBalance ?? 0;

    // If cash balance is 0 or uninitialized, calculate from historical sum
    if (cashBalance === 0) {
        const allTx = await CashTransaction.find({ company: companyId });
        let computed = 0;
        for (const t of allTx) {
            if (t.type === 'IN') computed += t.amount;
            else if (t.type === 'OUT') computed -= t.amount;
        }
        if (computed !== 0 && company) {
            company.cashBalance = computed;
            await company.save();
            cashBalance = computed;
        }
    }

    res.json({
        stats: {
            totalIn,
            totalOut,
            periodBalance: totalIn - totalOut,
            currentBalance: cashBalance
        },
        transactions
    });
});

// @desc    Add manual cash transaction (IN or OUT)
// @route   POST /api/cash/transactions
// @access  Private
const addCashTransaction = asyncHandler(async (req, res) => {
    const { 
        company, type, amount, category, description, reference, 
        receiptPhoto, date, bookingRef, clientId, guestName, driverRef, driverName 
    } = req.body;

    if (!company || !type || !amount) {
        res.status(400);
        throw new Error('Company, Type (IN/OUT), and Amount are required');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400);
        throw new Error('Valid amount is required');
    }

    const txDate = date ? DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toJSDate() : new Date();

    let resolvedBooking = null;
    let resolvedClientId = clientId || null;

    if (bookingRef) {
        resolvedBooking = await Booking.findById(bookingRef);
        if (resolvedBooking && !resolvedClientId && resolvedBooking.client) {
            resolvedClientId = resolvedBooking.client;
        }
    }

    const tx = await CashTransaction.create({
        company,
        type,
        amount: numAmount,
        category: category || (type === 'IN' ? 'General Cash IN' : 'General Cash OUT'),
        description: description || (resolvedBooking ? `Mr. ${String(resolvedBooking.clientName || '').replace(/^Mr\.?\s*/i, '')}` : ''),
        reference: reference || '',
        receiptPhoto: receiptPhoto || '',
        date: txDate,
        bookingRef: resolvedBooking ? resolvedBooking._id : null,
        clientRef: resolvedClientId || null,
        guestName: guestName || (resolvedBooking ? resolvedBooking.clientName : ''),
        driverRef: driverRef || null,
        driverName: driverName || '',
        createdBy: req.user._id
    });

    // Update company cash balance
    const comp = await Company.findById(company);
    if (comp) {
        comp.cashBalance = (comp.cashBalance || 0) + (type === 'IN' ? numAmount : -numAmount);
        await comp.save();
    }

    // Sync to Booking & Client Ledger if guest/client was selected on an IN transaction
    if (type === 'IN' && (resolvedBooking || resolvedClientId)) {
        try {
            if (resolvedBooking) {
                resolvedBooking.advancePaid = (Number(resolvedBooking.advancePaid) || 0) + numAmount;
                resolvedBooking.balanceDue = Math.max(0, (Number(resolvedBooking.totalAmount) || 0) - resolvedBooking.advancePaid);
                resolvedBooking.paymentStatus = resolvedBooking.balanceDue <= 0 ? 'Full Received' : 'Partial';
                await resolvedBooking.save();
            }
            if (resolvedClientId) {
                const clientDoc = await Client.findById(resolvedClientId);
                if (clientDoc) {
                    clientDoc.totalPaid = (Number(clientDoc.totalPaid) || 0) + numAmount;
                    clientDoc.balance = Math.max(0, (Number(clientDoc.balance) || 0) - numAmount);
                    await clientDoc.save();
                }
                await LedgerEntry.create({
                    client: resolvedClientId,
                    company,
                    type: category === 'Advance Payment' || category === 'Guest Advance / Fare' ? 'Advance' : 'Payment',
                    amount: numAmount,
                    date: txDate,
                    description: `Payment received${resolvedBooking ? ` for ${resolvedBooking.bookingId}` : ''} via Cash${reference ? ` (Ref: ${reference})` : ''}`,
                    referenceId: resolvedBooking ? resolvedBooking._id : tx._id
                });
            }
        } catch (syncErr) {
            console.error('Error syncing direct cash entry to booking/client ledger:', syncErr);
        }
    }

    res.status(201).json(tx);
});

// @desc    Deposit Cash into Bank (Cash ➔ Bank Transfer)
// @route   POST /api/cash/deposit-to-bank
// @access  Private
const depositCashToBank = asyncHandler(async (req, res) => {
    const { company, bankAccountId, amount, date, reference, description, receiptPhoto } = req.body;

    if (!company || !bankAccountId || !amount) {
        res.status(400);
        throw new Error('Company, Bank Account, and Amount are required');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400);
        throw new Error('Valid deposit amount is required');
    }

    const bank = await BankAccount.findById(bankAccountId);
    if (!bank) {
        res.status(404);
        throw new Error('Target Bank account not found');
    }

    const txDate = date ? DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toJSDate() : new Date();
    const refStr = reference || '';
    const descStr = description || `Cash deposited into ${bank.bankName} (${bank.accountNumber ? `A/C ${bank.accountNumber}` : ''})`;

    // 1. Create Cash OUT Transaction
    const cashTx = await CashTransaction.create({
        company,
        type: 'OUT',
        amount: numAmount,
        category: 'Bank Deposit',
        description: descStr,
        reference: refStr,
        receiptPhoto: receiptPhoto || '',
        bankAccount: bank._id,
        bankName: bank.bankName,
        date: txDate,
        createdBy: req.user._id
    });

    // 2. Create Bank IN Transaction
    const bankTx = await BankTransaction.create({
        company,
        bankAccount: bank._id,
        bankName: bank.bankName,
        type: 'IN',
        amount: numAmount,
        category: 'Cash Deposit',
        paymentMode: 'Cash',
        reference: refStr,
        description: descStr,
        paymentScreenshot: receiptPhoto || '',
        date: txDate,
        createdBy: req.user._id
    });

    // 3. Update Bank Balance (+ Amount)
    bank.currentBalance = (bank.currentBalance || 0) + numAmount;
    await bank.save();

    // 4. Update Company Cash Balance (- Amount)
    const comp = await Company.findById(company);
    if (comp) {
        comp.cashBalance = (comp.cashBalance || 0) - numAmount;
        await comp.save();
    }

    res.status(201).json({
        message: `₹${numAmount.toLocaleString()} deposited into ${bank.bankName} successfully!`,
        cashTransaction: cashTx,
        bankTransaction: bankTx,
        bankBalance: bank.currentBalance,
        cashBalance: comp?.cashBalance || 0
    });
});

// @desc    Withdraw Cash from Bank (Bank ➔ Cash Transfer)
// @route   POST /api/cash/withdraw-from-bank
// @access  Private
const withdrawCashFromBank = asyncHandler(async (req, res) => {
    const { company, bankAccountId, amount, date, reference, description, receiptPhoto } = req.body;

    if (!company || !bankAccountId || !amount) {
        res.status(400);
        throw new Error('Company, Bank Account, and Amount are required');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400);
        throw new Error('Valid withdrawal amount is required');
    }

    const bank = await BankAccount.findById(bankAccountId);
    if (!bank) {
        res.status(404);
        throw new Error('Source Bank account not found');
    }

    const txDate = date ? DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toJSDate() : new Date();
    const refStr = reference || '';
    const descStr = description || `Cash withdrawal from ${bank.bankName} (${bank.accountNumber ? `A/C ${bank.accountNumber}` : ''})`;

    // 1. Create Bank OUT Transaction
    const bankTx = await BankTransaction.create({
        company,
        bankAccount: bank._id,
        bankName: bank.bankName,
        type: 'OUT',
        amount: numAmount,
        category: 'Cash Withdrawal',
        paymentMode: 'Cash / Self',
        reference: refStr,
        description: descStr,
        paymentScreenshot: receiptPhoto || '',
        date: txDate,
        createdBy: req.user._id
    });

    // 2. Create Cash IN Transaction
    const cashTx = await CashTransaction.create({
        company,
        type: 'IN',
        amount: numAmount,
        category: 'Bank Withdrawal',
        description: descStr,
        reference: refStr,
        receiptPhoto: receiptPhoto || '',
        bankAccount: bank._id,
        bankName: bank.bankName,
        date: txDate,
        createdBy: req.user._id
    });

    // 3. Update Bank Balance (- Amount)
    bank.currentBalance = (bank.currentBalance || 0) - numAmount;
    await bank.save();

    // 4. Update Company Cash Balance (+ Amount)
    const comp = await Company.findById(company);
    if (comp) {
        comp.cashBalance = (comp.cashBalance || 0) + numAmount;
        await comp.save();
    }

    res.status(201).json({
        message: `₹${numAmount.toLocaleString()} withdrawn from ${bank.bankName} to Cash in Hand!`,
        cashTransaction: cashTx,
        bankTransaction: bankTx,
        bankBalance: bank.currentBalance,
        cashBalance: comp?.cashBalance || 0
    });
});

// @desc    Update cash transaction
// @route   PUT /api/cash/transactions/:id
// @access  Private
const updateCashTransaction = asyncHandler(async (req, res) => {
    const tx = await CashTransaction.findById(req.params.id);
    if (!tx) {
        res.status(404);
        throw new Error('Cash transaction not found');
    }

    const { amount, description, category, reference, receiptPhoto, date } = req.body;
    const oldAmount = tx.amount;
    const oldType = tx.type;

    if (amount !== undefined) {
        const newAmount = Number(amount);
        tx.amount = newAmount;

        // Adjust company cash balance
        const comp = await Company.findById(tx.company);
        if (comp) {
            // Revert old impact
            comp.cashBalance = (comp.cashBalance || 0) - (oldType === 'IN' ? oldAmount : -oldAmount);
            // Apply new impact
            comp.cashBalance = comp.cashBalance + (oldType === 'IN' ? newAmount : -newAmount);
            await comp.save();
        }
    }

    if (description !== undefined) tx.description = description;
    if (category !== undefined) tx.category = category;
    if (reference !== undefined) tx.reference = reference;
    if (receiptPhoto !== undefined) tx.receiptPhoto = receiptPhoto;
    if (date !== undefined) {
        tx.date = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toJSDate();
    }

    const updated = await tx.save();
    res.json(updated);
});

// @desc    Delete cash transaction
// @route   DELETE /api/cash/transactions/:id
// @access  Private
const deleteCashTransaction = asyncHandler(async (req, res) => {
    const tx = await CashTransaction.findById(req.params.id);
    if (!tx) {
        res.status(404);
        throw new Error('Cash transaction not found');
    }

    // Revert company cash balance
    const comp = await Company.findById(tx.company);
    if (comp) {
        comp.cashBalance = (comp.cashBalance || 0) - (tx.type === 'IN' ? tx.amount : -tx.amount);
        await comp.save();
    }

    // If it was a Bank Deposit or Bank Withdrawal, sync the bank account too
    if (tx.bankAccount) {
        const bank = await BankAccount.findById(tx.bankAccount);
        if (bank) {
            if (tx.category === 'Bank Deposit') {
                bank.currentBalance = (bank.currentBalance || 0) - tx.amount;
                await bank.save();
            } else if (tx.category === 'Bank Withdrawal') {
                bank.currentBalance = (bank.currentBalance || 0) + tx.amount;
                await bank.save();
            }
        }
    }

    await tx.deleteOne();
    res.json({ message: 'Cash transaction deleted successfully' });
});

module.exports = {
    getCashTransactions,
    addCashTransaction,
    depositCashToBank,
    withdrawCashFromBank,
    updateCashTransaction,
    deleteCashTransaction
};

