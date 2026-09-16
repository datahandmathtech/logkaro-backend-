const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    bankName: {
        type: String,
        required: true,
        trim: true
    },
    accountNumber: {
        type: String,
        default: '',
        trim: true
    },
    accountHolder: {
        type: String,
        default: '',
        trim: true
    },
    ifsc: {
        type: String,
        default: '',
        trim: true
    },
    branch: {
        type: String,
        default: '',
        trim: true
    },
    upiId: {
        type: String,
        default: '',
        trim: true
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

bankAccountSchema.index({ company: 1, bankName: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
