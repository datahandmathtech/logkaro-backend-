const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bankController.js', 'utf8');

// 1. ADD updateBankTransaction BEFORE deleteBankTransaction
const updateCode = `
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

    const newAmount = Number(amount);
    const oldAmount = tx.amount;
    const diff = newAmount - oldAmount;

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

    // Update Booking advancePaid if linked
    if (diff !== 0 && tx.bookingRef) {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(tx.bookingRef);
        if (booking) {
            if (tx.type === 'IN') {
                booking.advancePaid = Math.max(0, (booking.advancePaid || 0) + diff);
            } else {
                booking.advancePaid = (booking.advancePaid || 0) - diff;
            }
            booking.notes = (booking.notes || '') + \`\\n[System]: Payment edited in Bank Book from \${oldAmount} to \${newAmount} on \${new Date().toLocaleDateString()}.\`;
            await booking.save();
        }
    }

    // Update transaction fields
    tx.amount = newAmount;
    if (date) tx.date = date;
    if (description !== undefined) tx.description = description;
    if (category !== undefined) tx.category = category;
    if (paymentMode !== undefined) tx.paymentMode = paymentMode;
    if (reference !== undefined) tx.reference = reference;
    
    await tx.save();

    res.json(tx);
});

// @desc    Delete a bank transaction`;

if (!code.includes('updateBankTransaction = asyncHandler')) {
    code = code.replace('// @desc    Delete a bank transaction', updateCode);
}

// 2. MODIFY deleteBankTransaction to handle revertBooking
const oldDeleteLogic = `    // If transaction is linked to a booking, reverse the advancePaid
    if (tx.bookingRef) {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(tx.bookingRef);
        if (booking) {
            if (tx.type === 'IN') {
                booking.advancePaid = Math.max(0, (booking.advancePaid || 0) - tx.amount);
            } else {
                booking.advancePaid = (booking.advancePaid || 0) + tx.amount;
            }
            // Add a note about deleted transaction
            booking.notes = (booking.notes || '') + \`\\n[System]: Payment of \${tx.amount} deleted from Bank Book on \${new Date().toLocaleDateString()}.\`;
            await booking.save();
        }
    }

    await tx.deleteOne();
    res.json({ message: 'Transaction deleted successfully', currentBalance: bank ? bank.currentBalance : 0 });
});`;

const newDeleteLogic = `    // Handle revert booking logic
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
                        lead.status = 'Open';
                        lead.advancePayment = 0;
                        lead.bookingRef = null;
                        lead.bookingId = '';
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
                booking.notes = (booking.notes || '') + \`\\n[System]: Payment of \${tx.amount} deleted from Bank Book on \${new Date().toLocaleDateString()}.\`;
                await booking.save();
            }
        }
    }

    await tx.deleteOne();
    res.json({ message: 'Transaction deleted successfully', currentBalance: bank ? bank.currentBalance : 0 });
});`;

if (code.includes('await tx.deleteOne();') && !code.includes('revertBooking === \'true\'')) {
    code = code.replace(oldDeleteLogic, newDeleteLogic);
}

// 3. EXPORT updateBankTransaction
if (!code.includes('updateBankTransaction\n};') && !code.includes('updateBankTransaction,\n};') && !code.includes('updateBankTransaction\r\n};')) {
    code = code.replace('deleteBankTransaction\r\n};', 'deleteBankTransaction,\r\n    updateBankTransaction\r\n};').replace('deleteBankTransaction\n};', 'deleteBankTransaction,\n    updateBankTransaction\n};');
}

fs.writeFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bankController.js', code);
console.log('bankController patched successfully');
