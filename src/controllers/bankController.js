const asyncHandler = require('express-async-handler');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');

// @desc    Get all bank accounts for a company
// @route   GET /api/banks/company/:companyId
// @access  Private
const getBankAccounts = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const accounts = await BankAccount.find({ company: companyId, isActive: { $ne: false } }).sort({ createdAt: 1 }).lean();
    res.json(accounts);
});

// @desc    Create new bank account
// @route   POST /api/banks
// @access  Private/Admin
const createBankAccount = asyncHandler(async (req, res) => {
    const { company, bankName, accountNumber, accountHolder, ifsc, branch, upiId, openingBalance } = req.body;
    if (!company || !bankName) {
        res.status(400);
        throw new Error('Company and Bank Name are required');
    }

    const openBal = Number(openingBalance) || 0;
    const account = await BankAccount.create({
        company,
        bankName,
        accountNumber: accountNumber || '',
        accountHolder: accountHolder || '',
        ifsc: ifsc || '',
        branch: branch || '',
        upiId: upiId || '',
        openingBalance: openBal,
        currentBalance: openBal,
        isActive: true
    });

    res.status(201).json(account);
});

// @desc    Update bank account
// @route   PUT /api/banks/:id
// @access  Private/Admin
const updateBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const { bankName, accountNumber, accountHolder, ifsc, branch, upiId } = req.body;
    account.bankName = bankName || account.bankName;
    account.accountNumber = accountNumber !== undefined ? accountNumber : account.accountNumber;
    account.accountHolder = accountHolder !== undefined ? accountHolder : account.accountHolder;
    account.ifsc = ifsc !== undefined ? ifsc : account.ifsc;
    account.branch = branch !== undefined ? branch : account.branch;
    account.upiId = upiId !== undefined ? upiId : account.upiId;

    const updated = await account.save();
    res.json(updated);
});

// @desc    Delete (or deactivate) bank account
// @route   DELETE /api/banks/:id
// @access  Private/Admin
const deleteBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const txCount = await BankTransaction.countDocuments({ bankAccount: account._id });
    if (txCount > 0) {
        account.isActive = false;
        await account.save();
        return res.json({ message: 'Bank account deactivated because it has transactions' });
    }

    await account.deleteOne();
    res.json({ message: 'Bank account deleted successfully' });
});

// @desc    Get bank transactions with filters (daily, monthly, bank tab)
// @route   GET /api/banks/transactions/company/:companyId
// @access  Private
const getBankTransactions = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { bankAccountId, date, month, year, search } = req.query;

    let query = { company: companyId };

    if (bankAccountId && bankAccountId !== 'all') {
        query.bankAccount = bankAccountId;
    }

    // Date filter: Daily or Monthly
    if (date) {
        const d = new Date(date);
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (month && year) {
        const m = parseInt(month);
        const y = parseInt(year);
        const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);
        query.date = { $gte: startDate, $lte: endDate };
    }

    if (search) {
        query.$or = [
            { description: { $regex: search, $options: 'i' } },
            { reference: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { bankName: { $regex: search, $options: 'i' } }
        ];
    }

    let bankAccountsQuery = { company: companyId, isActive: true };
    if (bankAccountId && bankAccountId !== 'all') {
        bankAccountsQuery._id = bankAccountId;
    }

    const [transactions, accounts] = await Promise.all([
        BankTransaction.find(query)
            .populate('bankAccount', 'bankName accountNumber')
            .populate('bookingRef', 'bookingId clientCode clientName')
            .populate('clientRef', 'name mobile')
            .populate('createdBy', 'name')
            .sort({ date: -1, createdAt: -1 })
            .lean(),
        BankAccount.find(bankAccountsQuery).lean()
    ]);

    // Compute stats
    let totalIn = 0;
    let totalOut = 0;
    for (const tx of transactions) {
        if (tx.type === 'IN') totalIn += tx.amount;
        else if (tx.type === 'OUT') totalOut += tx.amount;
    }

    const overallBalance = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);

    res.json({
        stats: {
            totalIn,
            totalOut,
            periodBalance: totalIn - totalOut,
            currentBalance: overallBalance
        },
        transactions
    });
});

// @desc    Add manual bank transaction
// @route   POST /api/banks/transactions
// @access  Private
const addBankTransaction = asyncHandler(async (req, res) => {
    const { company, bankAccountId, type, amount, category, paymentMode, reference, paymentScreenshot, description, date, bookingRef, clientId } = req.body;
    
    if (!company || !bankAccountId || !type || !amount) {
        res.status(400);
        throw new Error('Company, Bank Account, Type, and Amount are required');
    }

    const bank = await BankAccount.findById(bankAccountId);
    if (!bank) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const numAmount = Number(amount);
    const txDate = date ? new Date(date) : new Date();

    let resolvedBooking = null;
    let resolvedClientId = clientId || null;

    if (bookingRef) {
        resolvedBooking = await Booking.findById(bookingRef);
        if (resolvedBooking && !resolvedClientId && resolvedBooking.client) {
            resolvedClientId = resolvedBooking.client;
        }
    }

    const tx = await BankTransaction.create({
        company,
        bankAccount: bank._id,
        bankName: bank.bankName,
        type,
        amount: numAmount,
        category: category || (type === 'IN' ? 'Deposit' : 'Withdrawal'),
        paymentMode: paymentMode || 'UPI / QR Code',
        reference: reference || '',
        paymentScreenshot: paymentScreenshot || '',
        description: description || (resolvedBooking ? `Mr. ${String(resolvedBooking.clientName || '').replace(/^Mr\.?\s*/i, '')}` : ''),
        bookingRef: resolvedBooking ? resolvedBooking._id : null,
        clientRef: resolvedClientId || null,
        date: txDate,
        createdBy: req.user ? req.user._id : null
    });

    // Update bank balance
    if (type === 'IN') {
        bank.currentBalance += numAmount;
    } else {
        bank.currentBalance -= numAmount;
    }
    await bank.save();

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
                    type: category === 'Advance Payment' ? 'Advance' : 'Payment',
                    amount: numAmount,
                    date: txDate,
                    description: `Payment received${resolvedBooking ? ` for ${resolvedBooking.bookingId}` : ''} via ${paymentMode || 'UPI / QR Code'} (${bank.bankName})${reference ? ` (Ref: ${reference})` : ''}`,
                    referenceId: resolvedBooking ? resolvedBooking._id : tx._id
                });
            }
        } catch (syncErr) {
            console.error('Error syncing direct bank entry to booking/client ledger:', syncErr);
        }
    }

    res.status(201).json({ transaction: tx, bankBalance: bank.currentBalance });
});


// @desc    Update a bank transaction
// @route   PUT /api/banks/transactions/:id
// @access  Private/Admin
const updateBankTransaction = asyncHandler(async (req, res) => {
    const { amount, date, description, category, paymentMode, reference } = req.body;
    
    const tx = await BankTransaction.findById(req.params.id);
    if (!tx) {
        res.status(404);
        throw new Error('Transaction not found');
    }

    const newAmount = amount !== undefined && amount !== '' ? Number(amount) : tx.amount;
    const oldAmount = tx.amount;
    const diff = newAmount - oldAmount;
    const parsedDate = date ? new Date(date) : tx.date;

    // Update bank balance
    if (diff !== 0) {
        const bank = await BankAccount.findById(tx.bankAccount);
        if (bank) {
            if (tx.type === 'IN') {
                bank.currentBalance += diff;
            } else {
                bank.currentBalance -= diff;
            }
            await bank.save();
        }
    }

    // Update Booking, Lead, and LedgerEntry if linked
    try {
        const Booking = require('../models/Booking');
        const Lead = require('../models/Lead');
        let booking = tx.bookingRef ? await Booking.findById(tx.bookingRef) : null;

        if (booking) {
            let noteStr = '';
            const bkgUpdates = {};
            if (diff !== 0) {
                const updatedAdv = tx.type === 'IN'
                    ? Math.max(0, (booking.advancePaid || 0) + diff)
                    : (booking.advancePaid || 0) - diff;
                bkgUpdates.advancePaid = updatedAdv;
                const fuelDed = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;
                bkgUpdates.balanceDue = Math.max(0, (Number(booking.totalAmount) || 0) - updatedAdv - fuelDed);
                bkgUpdates.paymentStatus = bkgUpdates.balanceDue <= 0 ? 'Full Received' : ((updatedAdv + fuelDed) > 0 ? 'Partial' : 'Pending');
                noteStr += `\n[System]: Payment amount edited in Bank Book from ${oldAmount} to ${newAmount} on ${new Date().toLocaleDateString()}.`;
            }

            if (date) {
                bkgUpdates.advanceDate = parsedDate;
                noteStr += `\n[System]: Payment date edited in Bank Book to ${parsedDate.toLocaleDateString()}.`;
                if (booking.lead) {
                    const leadUpdates = { advanceDate: parsedDate };
                    if (diff !== 0 && tx.type === 'IN') {
                        leadUpdates.advancePayment = bkgUpdates.advancePaid;
                    }
                    await Lead.findByIdAndUpdate(
                        booking.lead,
                        { $set: leadUpdates },
                        { timestamps: false }
                    );
                }
            }

            if (noteStr) {
                bkgUpdates.notes = (booking.notes || '') + noteStr;
            }
            if (Object.keys(bkgUpdates).length > 0) {
                await Booking.findByIdAndUpdate(booking._id, { $set: bkgUpdates });
            }

            // Also sync matching Client Ledger entry (Advance / Payment)
            const refIds = [booking._id, tx._id];
            if (booking.lead) refIds.push(booking.lead);
            let ledgerMatch = await LedgerEntry.findOne({
                $or: [
                    { sourceId: tx._id },
                    { referenceId: tx._id }
                ]
            });
            if (!ledgerMatch && tx.sourceId) {
                ledgerMatch = await LedgerEntry.findById(tx.sourceId);
            }
            if (!ledgerMatch) {
                // Match by booking/client and matching oldAmount
                ledgerMatch = await LedgerEntry.findOne({
                    client: booking.client,
                    type: { $in: ['Advance', 'Payment'] },
                    amount: oldAmount
                });
            }
            if (!ledgerMatch) {
                ledgerMatch = await LedgerEntry.findOne({
                    referenceId: { $in: refIds },
                    type: { $in: ['Advance', 'Payment'] },
                    amount: oldAmount
                });
            }
            if (!ledgerMatch) {
                // Fallback to any matching advance/payment for this booking
                ledgerMatch = await LedgerEntry.findOne({
                    referenceId: { $in: refIds },
                    type: { $in: ['Advance', 'Payment'] }
                });
            }
            if (ledgerMatch) {
                ledgerMatch.amount = newAmount;
                if (date) ledgerMatch.date = parsedDate;
                if (paymentMode) ledgerMatch.paymentMode = paymentMode;
                if (reference) ledgerMatch.reference = reference;
                await ledgerMatch.save();
            }
        } else {
            // Even if not linked via bookingRef, sync any direct LedgerEntry referencing this transaction
            let directLedger = await LedgerEntry.findOne({
                $or: [
                    { referenceId: tx._id },
                    { sourceId: tx._id }
                ],
                type: { $in: ['Advance', 'Payment'] }
            });
            if (!directLedger && tx.sourceId) {
                directLedger = await LedgerEntry.findById(tx.sourceId);
            }
            if (directLedger) {
                directLedger.amount = newAmount;
                if (date) directLedger.date = parsedDate;
                if (paymentMode) directLedger.paymentMode = paymentMode;
                if (reference) directLedger.reference = reference;
                await directLedger.save();
            }
        }
    } catch (syncErr) {
        console.error('Error syncing bank transaction edit to Booking/Lead/Ledger:', syncErr);
    }

    // Update transaction fields
    tx.amount = newAmount;
    if (date) tx.date = parsedDate;
    if (description !== undefined) tx.description = description;
    if (category !== undefined) tx.category = category;
    if (paymentMode !== undefined) tx.paymentMode = paymentMode;
    if (reference !== undefined) tx.reference = reference;
    
    await tx.save();

    res.json(tx);
});

// @desc    Delete a bank transaction
// @route   DELETE /api/banks/transactions/:id
// @access  Private/Admin
const deleteBankTransaction = asyncHandler(async (req, res) => {
    console.log("DELETE TRANSACTION HIT WITH ID:", req.params.id);
    const tx = await BankTransaction.findById(req.params.id);
    console.log("TRANSACTION FOUND?", !!tx);
    if (!tx) {
        res.status(404);
        throw new Error('Transaction not found');
    }

    const bank = await BankAccount.findById(tx.bankAccount);
    if (bank) {
        if (tx.type === 'IN') {
            bank.currentBalance -= tx.amount;
        } else {
            bank.currentBalance += tx.amount;
        }
        await bank.save();
    }

    // Handle revert booking logic
    if (tx.bookingRef) {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(tx.bookingRef);
        
        if (booking) {
            if (req.query.revertBooking === 'true') {
                // REVERT BOOKING TO LEAD
                const Lead = require('../models/Lead');
                if (booking.lead) {
                    const lead = await Lead.findById(booking.lead);
                    if (lead) {
                        lead.status = 'New';
                        lead.advancePayment = 0;
                        lead.bookingRef = null;
                        lead.bookingId = '';
                        lead.advanceDate = null;
                        await lead.save();
                    }
                }
                
                // Unlink DRSDuties
                const DRSDuty = require('../models/DRSDuty');
                await DRSDuty.updateMany({ bookingRef: booking._id }, { bookingRef: null, status: 'Pending' });
                
                // Delete the booking itself
                await booking.deleteOne();
            } else {
                // JUST REMOVE PAYMENT FROM BOOKING
                if (tx.type === 'IN') {
                    booking.advancePaid = Math.max(0, (booking.advancePaid || 0) - tx.amount);
                } else {
                    booking.advancePaid = (booking.advancePaid || 0) + tx.amount;
                }
                const payFuelDed = (booking.guestFuelFilled || Number(booking.guestFuelAmount) > 0) ? (Number(booking.guestFuelAmount) || 0) : 0;
                booking.balanceDue = Math.max(0, (Number(booking.totalAmount) || 0) - booking.advancePaid - payFuelDed);
                booking.paymentStatus = booking.balanceDue <= 0 ? 'Full Received' : (booking.advancePaid > 0 ? 'Partial' : 'No Advance');
                booking.notes = (booking.notes || '') + `\n[System]: Payment of ${tx.amount} deleted from Bank Book on ${new Date().toLocaleDateString()}.`;
                await booking.save();
            }
        }
    }

    await tx.deleteOne();
    res.json({ message: 'Transaction deleted successfully', currentBalance: bank ? bank.currentBalance : 0 });
});

module.exports = {
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getBankTransactions,
    addBankTransaction,
    deleteBankTransaction,
    updateBankTransaction
};
