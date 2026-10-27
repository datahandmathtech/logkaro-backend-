const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    vendorName: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    paymentType: {
        type: String,
        enum: ['Paid', 'Received'],
        default: 'Paid',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other', 'Others'],
        default: 'Bank Transfer'
    },
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    paidBy: {
        type: String,
        enum: ['Company', 'Others', 'Other'],
        default: 'Company'
    },
    referenceNumber: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

vendorPaymentSchema.index({ company: 1, vendorName: 1, date: -1 });
vendorPaymentSchema.index({ company: 1, date: -1 });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
