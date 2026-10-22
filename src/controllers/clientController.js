const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const CashTransaction = require('../models/CashTransaction');
const Company = require('../models/Company');
const asyncHandler = require('express-async-handler');

const mongoose = require('mongoose');

const getPeriodDateRange = (year, month) => {
    if (!year || year === 'all') return null;
    const y = Number(year);

    const monthMap = {
        'Apr': { m: 4, days: 30, calYear: y },
        'May': { m: 5, days: 31, calYear: y },
        'Jun': { m: 6, days: 30, calYear: y },
        'Jul': { m: 7, days: 31, calYear: y },
        'Aug': { m: 8, days: 31, calYear: y },
        'Sep': { m: 9, days: 30, calYear: y },
        'Oct': { m: 10, days: 31, calYear: y },
        'Nov': { m: 11, days: 30, calYear: y },
        'Dec': { m: 12, days: 31, calYear: y },
        'Jan': { m: 1, days: 31, calYear: y + 1 },
        'Feb': { m: 2, days: 29, calYear: y + 1 },
        'Mar': { m: 3, days: 31, calYear: y + 1 }
    };

    if (month && month !== 'All Months' && monthMap[month]) {
        const info = monthMap[month];
        const mStr = String(info.m).padStart(2, '0');
        const start = new Date(`${info.calYear}-${mStr}-01T00:00:00+05:30`);
        const end = new Date(`${info.calYear}-${mStr}-${info.days}T23:59:59.999+05:30`);
        return { start, end };
    }

    const start = new Date(`${y}-04-01T00:00:00+05:30`);
    const end = new Date(`${y + 1}-03-31T23:59:59.999+05:30`);
    return { start, end };
};

// @desc    Get all clients for a company with optional Financial Year & Month filtering
// @route   GET /api/clients/:companyId
// @access  Private/Admin
const getClients = asyncHandler(async (req, res) => {
    const { year, month, clientType } = req.query;
    const companyId = req.params.companyId;

    const filter = { company: companyId };
    if (clientType === 'Travel Agent') {
        filter.clientType = 'Travel Agent';
    } else if (clientType === 'Direct') {
        filter.clientType = { $ne: 'Travel Agent' };
    }

    const dateRange = getPeriodDateRange(year, month);

    if (dateRange) {
        const fullFYRange = getPeriodDateRange(year, 'All Months');
        const companyObjId = new mongoose.Types.ObjectId(companyId);

        // Run client query and both ledger aggregations concurrently
        const [clients, fyLedgers, annualFYLedgers] = await Promise.all([
            Client.find(filter).sort({ updatedAt: -1 }).lean(),
            LedgerEntry.aggregate([
                {
                    $match: {
                        company: companyObjId,
                        date: { $gte: dateRange.start, $lte: dateRange.end }
                    }
                },
                {
                    $group: {
                        _id: '$client',
                        fyBilled: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'Bill'] }, '$amount', 0]
                            }
                        },
                        fyPaid: {
                            $sum: {
                                $cond: [{ $in: ['$type', ['Payment', 'Advance', 'Fuel']] }, '$amount', 0]
                            }
                        },
                        fyTripsCount: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'Bill'] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            LedgerEntry.aggregate([
                {
                    $match: {
                        company: companyObjId,
                        date: { $gte: fullFYRange.start, $lte: fullFYRange.end }
                    }
                },
                {
                    $group: {
                        _id: '$client',
                        annualBilled: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'Bill'] }, '$amount', 0]
                            }
                        },
                        annualTripsCount: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'Bill'] }, 1, 0]
                            }
                        }
                    }
                }
            ])
        ]);

        const fyMap = new Map();
        fyLedgers.forEach(l => {
            if (l._id) {
                fyMap.set(l._id.toString(), {
                    fyBilled: l.fyBilled || 0,
                    fyPaid: l.fyPaid || 0,
                    fyBalance: (l.fyBilled || 0) - (l.fyPaid || 0),
                    fyTripsCount: l.fyTripsCount || 0
                });
            }
        });

        const annualMap = new Map();
        annualFYLedgers.forEach(a => {
            if (a._id) {
                annualMap.set(a._id.toString(), {
                    annualBilled: a.annualBilled || 0,
                    annualTripsCount: a.annualTripsCount || 0
                });
            }
        });

        const enhancedClients = clients.map(c => {
            const fyData = fyMap.get(c._id.toString()) || {
                fyBilled: 0,
                fyPaid: 0,
                fyBalance: 0,
                fyTripsCount: 0
            };
            const annualData = annualMap.get(c._id.toString()) || {
                annualBilled: 0,
                annualTripsCount: 0
            };
            return {
                ...c,
                ...fyData,
                annualBilled: annualData.annualBilled,
                annualTripsCount: annualData.annualTripsCount,
                selectedFY: year,
                selectedMonth: month || 'All Months'
            };
        });

        return res.json(enhancedClients);
    } else {
        const [clients, tripCounts] = await Promise.all([
            Client.find(filter).sort({ updatedAt: -1 }).lean(),
            LedgerEntry.aggregate([
                {
                    $match: {
                        company: new mongoose.Types.ObjectId(companyId),
                        type: 'Bill'
                    }
                },
                {
                    $group: {
                        _id: '$client',
                        totalTripsCount: { $sum: 1 }
                    }
                }
            ])
        ]);
        const tripMap = new Map();
        tripCounts.forEach(t => {
            if (t._id) tripMap.set(t._id.toString(), t.totalTripsCount || 0);
        });

        const enhancedClients = clients.map(c => ({
            ...c,
            fyBilled: c.totalBilled || 0,
            fyPaid: c.totalPaid || 0,
            fyBalance: c.balance || 0,
            fyTripsCount: tripMap.get(c._id.toString()) || 0,
            annualBilled: c.totalBilled || 0,
            annualTripsCount: tripMap.get(c._id.toString()) || 0,
            selectedFY: 'all',
            selectedMonth: 'All Months'
        }));

        return res.json(enhancedClients);
    }
});

// @desc    Get client ledger entries with optional FY & Month filter
// @route   GET /api/clients/:id/ledger
// @access  Private/Admin
const getClientLedger = asyncHandler(async (req, res) => {
    const { year, month } = req.query;
    const query = { client: req.params.id };

    const dateRange = getPeriodDateRange(year, month);
    if (dateRange) {
        query.date = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const entries = await LedgerEntry.find(query).sort({ date: -1, createdAt: -1 }).lean();

    try {
        const refIds = entries.map(e => e.referenceId).filter(Boolean);
        const orClauses = [{ clientRef: req.params.id }];
        if (refIds.length > 0) {
            orClauses.push(
                { bookingRef: { $in: refIds } },
                { leadRef: { $in: refIds } },
                { sourceId: { $in: refIds } }
            );
        }

        const [bankTxs, cashTxs] = await Promise.all([
            BankTransaction.find({ type: 'IN', $or: orClauses })
                .populate('bankAccount', 'bankName')
                .sort({ date: 1, createdAt: 1 })
                .lean(),
            CashTransaction.find({ type: 'IN', $or: orClauses })
                .sort({ date: 1, createdAt: 1 })
                .lean()
        ]);

        const usedBankTxIds = new Set();
        const usedCashTxIds = new Set();

        // Match chronologically (oldest to newest)
        const chronological = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (const entry of chronological) {
            if (!['Payment', 'Advance'].includes(entry.type)) continue;
            if (entry.bankName) continue;

            const amt = Number(entry.amount) || 0;
            const entryDay = entry.date ? new Date(entry.date).toISOString().split('T')[0] : '';

            // 1. Try matching BankTransaction by exact amount + same date (or same referenceId)
            let matchedBank = bankTxs.find(tx => {
                if (usedBankTxIds.has(String(tx._id))) return false;
                if (Number(tx.amount) !== amt) return false;
                const txDay = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
                return txDay === entryDay;
            });

            if (!matchedBank) {
                matchedBank = bankTxs.find(tx => {
                    if (usedBankTxIds.has(String(tx._id))) return false;
                    if (Number(tx.amount) !== amt) return false;
                    if (entry.referenceId && (
                        String(tx.bookingRef) === String(entry.referenceId) ||
                        String(tx.leadRef) === String(entry.referenceId) ||
                        String(tx.sourceId) === String(entry.referenceId)
                    )) {
                        return true;
                    }
                    return false;
                });
            }

            if (!matchedBank) {
                matchedBank = bankTxs.find(tx => !usedBankTxIds.has(String(tx._id)) && Number(tx.amount) === amt);
            }

            if (matchedBank) {
                usedBankTxIds.add(String(matchedBank._id));
                const bName = matchedBank.bankAccount?.bankName || matchedBank.bankName || '';
                if (bName) {
                    entry.bankName = bName;
                    entry.paymentMode = bName;
                    continue;
                }
            }

            // 2. Try matching CashTransaction
            const matchedCash = cashTxs.find(tx => !usedCashTxIds.has(String(tx._id)) && Number(tx.amount) === amt);
            if (matchedCash || (entry.description && /via\s+(driver\s+)?cash/i.test(entry.description))) {
                if (matchedCash) usedCashTxIds.add(String(matchedCash._id));
                entry.bankName = 'Cash';
                entry.paymentMode = 'Cash';
            }
        }
    } catch (enrichErr) {
        console.error('Error enriching client ledger with bank names:', enrichErr);
    }

    res.json(entries);
});

// @desc    Add manual payment to client ledger
// @route   POST /api/clients/:id/payment
// @access  Private/Admin
const addPayment = asyncHandler(async (req, res) => {
    const { amount, description, date, paymentMode, bankAccountId, reference } = req.body;
    const numAmount = Number(amount);
    
    const client = await Client.findById(req.params.id);
    if (!client) {
        res.status(404);
        throw new Error('Client not found');
    }

    client.totalPaid += numAmount;
    client.balance -= numAmount;
    await client.save();

    const entry = await LedgerEntry.create({
        client: client._id,
        company: client.company,
        type: 'Payment',
        amount: numAmount,
        description: description || `Manual Payment Received via ${paymentMode || 'Cash'}`,
        date: date || Date.now()
    });

    // Sync to Cash Book or Bank Book
    if (numAmount > 0) {
        const isCash = (
            paymentMode === 'Cash' ||
            paymentMode === 'Driver Cash' ||
            paymentMode === 'Cash to Company' ||
            (paymentMode && paymentMode.toLowerCase().includes('cash')) ||
            !paymentMode
        );

        if (isCash) {
            try {
                await CashTransaction.create({
                    company: client.company,
                    type: 'IN',
                    amount: numAmount,
                    category: 'Client Payment',
                    reference: reference || '',
                    description: description || `Payment Received - ${client.agencyName || client.name}`,
                    clientRef: client._id,
                    guestName: client.agencyName || client.name,
                    sourceId: entry._id,
                    sourceType: 'ClientPayment',
                    date: date || Date.now(),
                    createdBy: req.user ? req.user._id : null
                });
                await Company.findByIdAndUpdate(client.company, {
                    $inc: { cashBalance: numAmount }
                });
            } catch (cashErr) {
                console.error('Error creating cash transaction for client payment:', cashErr);
            }
        } else {
            try {
                let bank = null;
                if (bankAccountId) {
                    bank = await BankAccount.findById(bankAccountId);
                }
                if (!bank) {
                    bank = await BankAccount.findOne({ company: client.company, isDefault: true })
                        || await BankAccount.findOne({ company: client.company });
                }

                if (bank) {
                    await BankTransaction.create({
                        company: client.company,
                        bankAccount: bank._id,
                        bankName: bank.bankName || '',
                        type: 'IN',
                        amount: numAmount,
                        category: 'Client Payment',
                        paymentMode: paymentMode || 'Bank Transfer / NEFT',
                        reference: reference || '',
                        description: description || `Payment Received - ${client.agencyName || client.name}`,
                        clientRef: client._id,
                        sourceId: entry._id,
                        sourceType: 'ClientPayment',
                        date: date || Date.now(),
                        createdBy: req.user ? req.user._id : null
                    });
                    bank.currentBalance = (bank.currentBalance || 0) + numAmount;
                    await bank.save();
                }
            } catch (bankErr) {
                console.error('Error recording bank transaction for client payment:', bankErr);
            }
        }
    }

    res.status(201).json({ message: 'Payment recorded', client, entry });
});

// @desc    Update client GST info
// @route   PUT /api/clients/:id
// @access  Private/Admin
const updateClient = asyncHandler(async (req, res) => {
    const { gstNumber, address, name, mobile } = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, {
        gstNumber, address, name, mobile
    }, { new: true });
    
    if(!client) {
        res.status(404);
        throw new Error('Client not found');
    }

    res.json(client);
});


// @desc    Create or enlist a client / travel agent
// @route   POST /api/clients
// @access  Private/Admin
const createClient = asyncHandler(async (req, res) => {
    const { company, name, mobile, clientType, agencyName, contactPerson, city, email, gstNumber, address } = req.body;
    if (!company || !name) {
        res.status(400);
        throw new Error('Company and name are required');
    }

    const cleanMobile = mobile && mobile.trim() ? mobile.trim() : `AGENT-${Date.now().toString().slice(-6)}`;
    
    // Check if client with this mobile exists in company
    let client = await Client.findOne({ company, mobile: cleanMobile });
    if (client) {
        client.clientType = clientType || client.clientType;
        client.agencyName = agencyName || client.agencyName;
        client.contactPerson = contactPerson || client.contactPerson;
        client.city = city || client.city;
        client.email = email || client.email;
        client.name = name || client.name;
        if (gstNumber) client.gstNumber = gstNumber;
        if (address) client.address = address;
        await client.save();
        return res.json(client);
    }

    client = await Client.create({
        company,
        name,
        mobile: cleanMobile,
        clientType: clientType || 'Direct',
        agencyName: agencyName || '',
        contactPerson: contactPerson || '',
        city: city || '',
        email: email || '',
        gstNumber: gstNumber || '',
        address: address || ''
    });

    res.status(201).json(client);
});

// @desc    Update client ledger entry
// @route   PUT /api/clients/ledger/:id
// @access  Private/AdminOrExecutive
const updateLedgerEntry = asyncHandler(async (req, res) => {
    const entry = await LedgerEntry.findById(req.params.id);
    if (!entry) {
        res.status(404);
        throw new Error('Ledger entry not found');
    }

    const { amount, date, description, paymentMode, bankAccountId, bankName, reference } = req.body;
    const oldAmount = Number(entry.amount) || 0;
    const newAmount = amount !== undefined && amount !== '' ? Number(amount) : oldAmount;
    const diff = newAmount - oldAmount;
    const parsedDate = date ? new Date(date) : entry.date;

    // Update Client totals if amount changed
    if (diff !== 0) {
        const client = await Client.findById(entry.client);
        if (client) {
            client.totalPaid = Math.max(0, (client.totalPaid || 0) + diff);
            client.balance = Math.max(0, (client.balance || 0) - diff);
            await client.save();
        }
    }

    // Update the ledger entry fields
    entry.amount = newAmount;
    if (date) entry.date = parsedDate;
    if (paymentMode) entry.paymentMode = paymentMode;
    if (bankName) entry.bankName = bankName;
    if (description) {
        entry.description = description;
    } else if (paymentMode || reference) {
        const modeLabel = bankName || paymentMode || 'Payment';
        const refLabel = reference ? ` (Ref: ${reference})` : '';
        entry.description = `${entry.type} received via ${modeLabel}${refLabel}`;
    }
    await entry.save();

    // Sync to linked Booking & Lead
    try {
        const Booking = require('../models/Booking');
        const Lead = require('../models/Lead');
        
        let booking = null;
        if (entry.referenceId) {
            booking = await Booking.findById(entry.referenceId);
            if (!booking) {
                booking = await Booking.findOne({ lead: entry.referenceId });
            }
        }
        if (!booking && entry.client) {
            booking = await Booking.findOne({ client: entry.client }).sort({ createdAt: -1 });
        }

        if (booking) {
            const bkgUpdates = {};
            if (diff !== 0) {
                const updatedAdv = Math.max(0, (Number(booking.advancePaid) || 0) + diff);
                bkgUpdates.advancePaid = updatedAdv;
                const fuelDed = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;
                bkgUpdates.balanceDue = Math.max(0, (Number(booking.totalAmount) || 0) - updatedAdv - fuelDed);
                bkgUpdates.paymentStatus = bkgUpdates.balanceDue <= 0 ? 'Full Received' : ((updatedAdv + fuelDed) > 0 ? 'Partial' : 'Pending');
            }
            if (entry.type === 'Advance' && bankName) {
                bkgUpdates.bankName = bankName;
            }
            if (date && entry.type === 'Advance') {
                bkgUpdates.advanceDate = parsedDate;
            }
            if (Object.keys(bkgUpdates).length > 0) {
                await Booking.findByIdAndUpdate(booking._id, { $set: bkgUpdates });
            }

            if (booking.lead && entry.type === 'Advance') {
                const leadUpdates = {};
                if (diff !== 0) leadUpdates.advancePayment = (bkgUpdates.advancePaid !== undefined ? bkgUpdates.advancePaid : newAmount);
                if (date) leadUpdates.advanceDate = parsedDate;
                if (Object.keys(leadUpdates).length > 0) {
                    await Lead.findByIdAndUpdate(booking.lead, { $set: leadUpdates }, { timestamps: false });
                }
            }
        }

        // Sync with Fuel, BankTransaction or CashTransaction
        if (entry.type === 'Fuel') {
            try {
                const Fuel = require('../models/Fuel');
                let fuelDoc = entry.referenceId ? await Fuel.findById(entry.referenceId) : null;
                if (!fuelDoc && booking) {
                    fuelDoc = await Fuel.findOne({ booking: booking._id, paymentSource: 'Guest' });
                }
                if (fuelDoc) {
                    fuelDoc.amount = newAmount;
                    if (date) fuelDoc.date = parsedDate;
                    await fuelDoc.save();
                }
                if (booking) {
                    booking.guestFuelFilled = newAmount > 0;
                    booking.guestFuelAmount = newAmount;
                    booking.balanceDue = Math.max(0, (Number(booking.totalAmount) || 0) - (Number(booking.advancePaid) || 0) - newAmount);
                    booking.paymentStatus = booking.balanceDue <= 0 ? 'Full Received' : ((Number(booking.advancePaid) || 0) + newAmount > 0 ? 'Partial' : 'Pending');
                    await booking.save();
                }
            } catch (fErr) {
                console.error('Error syncing fuel entry:', fErr);
            }
        } else {
            const isCash = (paymentMode && /cash/i.test(paymentMode)) || (bankName && /cash/i.test(bankName));

            if (isCash) {
                let cashTx = await CashTransaction.findOne({
                    $or: [
                        { sourceId: entry._id },
                        { referenceId: entry._id },
                        ...(entry.sourceId ? [{ _id: entry.sourceId }] : [])
                    ]
                });
                if (!cashTx && booking) {
                    cashTx = await CashTransaction.findOne({
                        bookingRef: booking._id,
                        amount: oldAmount
                    });
                }
                if (!cashTx && booking) {
                    cashTx = await CashTransaction.findOne({
                        bookingRef: booking._id
                    }).sort({ date: -1 });
                }
                if (cashTx) {
                    cashTx.amount = newAmount;
                    if (date) cashTx.date = parsedDate;
                    if (reference) cashTx.reference = reference;
                    await cashTx.save();
                    if (diff !== 0) {
                        await Company.findByIdAndUpdate(cashTx.company, { $inc: { cashBalance: diff } });
                    }
                }
            } else {
                let bankTx = await BankTransaction.findOne({
                    $or: [
                        { sourceId: entry._id },
                        { referenceId: entry._id },
                        ...(entry.sourceId ? [{ _id: entry.sourceId }] : [])
                    ]
                });
                if (!bankTx && booking) {
                    bankTx = await BankTransaction.findOne({
                        bookingRef: booking._id,
                        amount: oldAmount
                    });
                }
                if (!bankTx && booking) {
                    bankTx = await BankTransaction.findOne({
                        bookingRef: booking._id
                    }).sort({ date: -1 });
                }
                if (bankTx) {
                    bankTx.amount = newAmount;
                    if (date) bankTx.date = parsedDate;
                    if (bankName) bankTx.bankName = bankName;
                    if (bankAccountId) bankTx.bankAccount = bankAccountId;
                    if (paymentMode) bankTx.paymentMode = paymentMode;
                    if (reference) bankTx.reference = reference;
                    await bankTx.save();
                    if (diff !== 0) {
                        await BankAccount.findByIdAndUpdate(bankTx.bankAccount, { $inc: { currentBalance: diff } });
                    }
                }
            }
        }
    } catch (syncErr) {
        console.error('Error syncing edited ledger entry:', syncErr);
    }

    res.json({ success: true, message: 'Ledger entry updated successfully', entry });
});

// @desc    Delete client ledger entry
// @route   DELETE /api/clients/ledger/:id
// @access  Private/AdminOrExecutive
const deleteLedgerEntry = asyncHandler(async (req, res) => {
    const entry = await LedgerEntry.findById(req.params.id);
    if (!entry) {
        res.status(404);
        throw new Error('Ledger entry not found');
    }

    const amt = Number(entry.amount) || 0;
    const client = await Client.findById(entry.client);
    if (client) {
        client.totalPaid = Math.max(0, (client.totalPaid || 0) - amt);
        client.balance = Math.max(0, (client.balance || 0) + amt);
        await client.save();
    }

    if (entry.referenceId) {
        const Booking = require('../models/Booking');
        let booking = await Booking.findById(entry.referenceId);
        if (!booking) booking = await Booking.findOne({ lead: entry.referenceId });
        if (booking) {
            const updatedAdv = Math.max(0, (Number(booking.advancePaid) || 0) - amt);
            const fuelDed = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;
            const balDue = Math.max(0, (Number(booking.totalAmount) || 0) - updatedAdv - fuelDed);
            const pStatus = balDue <= 0 ? 'Full Received' : (updatedAdv > 0 ? 'Partial' : 'Pending');
            await Booking.findByIdAndUpdate(booking._id, {
                $set: { advancePaid: updatedAdv, balanceDue: balDue, paymentStatus: pStatus }
            });
        }
    }

    await entry.deleteOne();
    res.json({ success: true, message: 'Ledger entry deleted successfully' });
});

module.exports = {
    getClients,
    getClientLedger,
    addPayment,
    updateClient,
    createClient,
    updateLedgerEntry,
    deleteLedgerEntry
};
