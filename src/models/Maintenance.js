const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    maintenanceType: {
        type: String,
        required: true
    },
    category: {
        type: String, // Sub-category like 'Engine oil change', 'New tyre purchase' etc.
    },
    partsChanged: [String],
    description: String,
    garageName: String,
    billNumber: String,
    billDate: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cash by Guest', 'Other', 'Others', 'Others / Personal'],
        default: 'Cash'
    },
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Due'],
        default: 'Paid'
    },
    paymentSource: {
        type: String,
        enum: ['Office', 'Guest', 'Main Office', 'Paid', 'Others', 'Other'],
        default: 'Office'
    },
    currentKm: Number,
    nextServiceKm: Number,
    nextServiceDate: Date,
    billPhoto: String, // Cloudinary URL
    status: {
        type: String,
        enum: ['Completed', 'Pending', 'Scheduled'],
        default: 'Completed'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for faster monthly analytics
maintenanceSchema.index({ company: 1, billDate: 1 });
maintenanceSchema.index({ vehicle: 1, billDate: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
