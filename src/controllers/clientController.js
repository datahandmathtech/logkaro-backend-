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

    const clients = await Client.find(filter).sort({ updatedAt: -1 }).lean();
    const dateRange = getPeriodDateRange(year, month);

    if (dateRange) {
        // Compute period figures
        const fyLedgers = await LedgerEntry.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
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
        ]);

        // Also compute full FY Annual Turnover for Diwali gift tier
        const fullFYRange = getPeriodDateRange(year, 'All Months');
        const annualFYLedgers = await LedgerEntry.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
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
        const tripCounts = await LedgerEntry.aggregate([
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

    const entries = await LedgerEntry.find(query).sort({ date: -1, createdAt: -1 });
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

module.exports = {
    getClients,
    getClientLedger,
    addPayment,
    updateClient,
    createClient
};
