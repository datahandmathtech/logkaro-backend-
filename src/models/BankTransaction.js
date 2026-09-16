const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true
    },
    bankName: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['IN', 'OUT'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        default: 'Booking Advance'
    },
    paymentMode: {
        type: String,
        default: 'UPI / QR Code'
    },
    reference: {
        type: String,
        default: ''
    },
    paymentScreenshot: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    bookingRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    leadRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        default: null
    },
    clientRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

bankTransactionSchema.index({ company: 1, date: -1 });
bankTransactionSchema.index({ bankAccount: 1, date: -1 });

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);
