const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    type: {
        type: String,
        enum: ['IN', 'OUT'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        default: 'General Cash'
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        default: ''
    },
    reference: {
        type: String,
        default: ''
    },
    receiptPhoto: {
        type: String,
        default: ''
    },
    // If related to Bank Transfer (Deposit to Bank or Withdrawal from Bank)
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    bankName: {
        type: String,
        default: ''
    },
    // If related to Booking / Guest
    bookingRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    bookingId: {
        type: String,
        default: ''
    },
    guestName: {
        type: String,
        default: ''
    },
    clientRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    leadRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    // If related to Driver
    driverRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    driverName: {
        type: String,
        default: ''
    },
    // Polymorphic Source Link (Advance, Fuel, Maintenance, BorderTax, Fastag, Parking, Booking, Expense, Allowance, etc.)
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    sourceType: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

cashTransactionSchema.index({ company: 1, date: -1 });
cashTransactionSchema.index({ company: 1, type: 1 });
cashTransactionSchema.index({ sourceId: 1 });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
