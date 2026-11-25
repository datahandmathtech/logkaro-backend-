const mongoose = require('mongoose');

const vehicleRequirementSchema = new mongoose.Schema({
    category: { type: String, default: 'Sedan' }, // Sedan, SUV, Innova Crysta, Tempo Traveller, Bus, etc.
    model: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    remarks: { type: String, default: '' }
}, { _id: true });

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    client: {
        type: String // e.g., Reliance, Wedding Party, John Doe
    },
    clientPhone: {
        type: String,
        default: ''
    },
    clientEmail: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        default: 'Direct'
    },
    eventType: {
        type: String,
        default: 'Wedding' // Wedding, Corporate, Tour, VIP, Other
    },
    date: {
        type: Date,
        required: true
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    location: {
        type: String
    },
    pickupLocation: {
        type: String,
        default: ''
    },
    dropLocation: {
        type: String,
        default: ''
    },
    itinerary: {
        type: String,
        default: ''
    },
    reportingTime: {
        type: String,
        default: ''
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ['Lead', 'Upcoming', 'Running', 'Closed', 'Lost', 'Cancelled'],
        default: 'Upcoming'
    },
    // Multi-vehicle requirements grid (Sedan x 5, Innova x 3, etc.)
    vehicleRequirements: [vehicleRequirementSchema],

    // Tariff / Rate Cards defined for this specific event
    rateCard: [{
        serviceName: { type: String, required: true },
        vehicleType: { type: String },
        vehicleModel: { type: String },
        baseRate: { type: Number, required: true, default: 0 },
        baseKms: { type: Number, default: 0 },
        baseHours: { type: Number, default: 0 },
        extraKmRate: { type: Number, default: 0 },
        extraHourRate: { type: Number, default: 0 },
        driverAllowance: { type: Number, default: 0 }
    }],

    // Financial Tracking
    proformaAmount: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    amountReceived: {
        type: Number,
        default: 0
    },
    advanceAmount: {
        type: Number,
        default: 0
    },
    advanceDate: {
        type: Date
    },
    paymentMode: {
        type: String,
        default: 'Bank'
    },
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    bankTransactionRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankTransaction'
    },
    cashTransactionRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashTransaction'
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundMode: {
        type: String,
        default: 'Bank'
    },
    refundBankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    lostReason: {
        type: String,
        default: ''
    },
    totalExpense: {
        type: Number,
        default: 0
    },
    customVehicles: {
        type: Map,
        of: [String],
        default: {}
    }
}, { timestamps: true });

// Index for faster queries
eventSchema.index({ company: 1, date: 1 });
eventSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
