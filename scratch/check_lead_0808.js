const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;

    const bkgs = await db.collection('bookings').find({
        $or: [
            { bookingId: /08\/08/i },
            { clientCode: /08\/08/i },
            { clientName: /Worldwing/i },
            { bookingId: /10\/70/i },
            { clientCode: /10\/70/i }
        ]
    }).toArray();

    console.log('Bookings found:', bkgs.length);
    for (const b of bkgs) {
        console.log('Booking:', {
            _id: b._id,
            bookingId: b.bookingId,
            clientCode: b.clientCode,
            clientName: b.clientName,
            totalAmount: b.totalAmount,
            advancePaid: b.advancePaid,
            advanceDate: b.advanceDate,
            bankName: b.bankName,
            bankAccountId: b.bankAccountId,
            paymentMode: b.paymentMode,
            createdAt: b.createdAt,
            travelStartDate: b.travelStartDate,
            travelEndDate: b.travelEndDate
        });
    }

    const leads = await db.collection('leads').find({
        $or: [
            { leadId: /08\/08/i },
            { clientName: /Worldwing/i },
            { leadId: /10\/70/i }
        ]
    }).toArray();

    console.log('\nLeads found:', leads.length);
    for (const l of leads) {
        console.log('Lead:', {
            _id: l._id,
            leadId: l.leadId,
            clientName: l.clientName,
            advancePaid: l.advancePaid,
            advancePaymentDate: l.advancePaymentDate,
            paymentMode: l.paymentMode,
            bankAccount: l.bankAccount,
            bankName: l.bankName,
            totalAmount: l.totalAmount,
            createdAt: l.createdAt
        });
    }

    // Check bank transactions for 24 Sept 2026 or amount 4000
    const bankTxs = await db.collection('banktransactions').find({
        $or: [
            { amount: 4000 },
            { description: /Worldwing/i },
            { description: /08\/08/i },
            { reference: /08\/08/i }
        ]
    }).toArray();

    console.log('\nBank Transactions found:', bankTxs.length);
    for (const tx of bankTxs) {
        console.log('BankTx:', {
            _id: tx._id,
            bankAccount: tx.bankAccount,
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            description: tx.description,
            mode: tx.mode,
            company: tx.company
        });
    }

    // Check client ledger entries for Worldwing
    const ledgerEntries = await db.collection('ledgerentries').find({
        $or: [
            { description: /Worldwing/i },
            { amount: 4000 }
        ]
    }).toArray();

    console.log('\nLedger Entries found:', ledgerEntries.length);
    for (const le of ledgerEntries) {
        console.log('LedgerEntry:', {
            _id: le._id,
            client: le.client,
            type: le.type,
            amount: le.amount,
            date: le.date,
            description: le.description,
            referenceId: le.referenceId
        });
    }

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
