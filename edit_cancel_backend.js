const fs = require('fs');

let code = fs.readFileSync('src/controllers/bookingController.js', 'utf8');

const replacement = `
    const advancePaid = booking.advancePaid || 0;
    const refund = Number(refundAmount) || 0;
    
    // Process refund logic
    if (refund > 0) {
        const LedgerEntry = require('../models/LedgerEntry');
        const BankAccount = require('../models/BankAccount');
        const BankTransaction = require('../models/BankTransaction');

        await LedgerEntry.create({
            client: booking.client,
            company: booking.company,
            type: 'Refund',
            amount: refund,
            description: \`Refund for cancelled booking \${booking.bookingCode || booking.bookingId} via \${refundMode || 'Bank'}\`,
            referenceId: booking._id,
            date: new Date()
        });

        if (refundMode === 'Bank') {
            try {
                let bank = await BankAccount.findOne({ company: booking.company, isDefault: true })
                    || await BankAccount.findOne({ company: booking.company });
                
                if (bank) {
                    await BankTransaction.create({
                        company: booking.company,
                        bankAccount: bank._id,
                        bankName: bank.bankName || '',
                        type: 'OUT',
                        amount: refund,
                        paymentMode: 'Bank Transfer / NEFT',
                        category: 'Refund',
                        reference: '',
                        description: \`Refund Issued - \${booking.clientName}\`,
                        bookingRef: booking._id,
                        clientRef: booking.client || null,
                        date: new Date(),
                        createdBy: req.user ? req.user._id : null
                    });
                    bank.currentBalance = (bank.currentBalance || 0) - refund;
                    await bank.save();
                }
            } catch (bankErr) {
                console.error('Error creating bank transaction on refund:', bankErr);
            }
        }
        
        booking.advancePaid -= refund; // Retained amount
    }
`;

code = code.replace(
    /const advancePaid = booking\.advancePaid \|\| 0;[\s\S]*?booking\.advancePaid -= refund; \/\/ Retained amount\n\s*\}/,
    replacement
);

fs.writeFileSync('src/controllers/bookingController.js', code);
console.log('Fixed backend cancelBooking refund logic.');
