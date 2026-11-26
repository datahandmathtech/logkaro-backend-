const mongoose = require('mongoose');

const vehicleRequirementSchema = new mongoose.Schema({
    category: { type: String, default: 'Sedan' }, // Sedan, SUV, Innova Crysta, Tempo Traveller, Bus, etc.
    model: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    remarks: { type: String, default: '' }
}, { _id: true });

const excelDutySchema = new mongoose.Schema({
    dutyId: { type: String, default: '' }, // e.g. LK-001
    guestGroup: { type: String, default: '' }, // e.g. Mr. Rahul + 9
    pax: { type: Number, default: 1 },
    carType: { type: String, default: 'Sedan' },
    serviceType: { type: String, default: 'ARRIVAL' }, // ARRIVAL, DEPARTURE, DISPOSAL, INTERCITY, LOCAL
    pickupDate: { type: String, default: '' },
    guestPickup: { type: String, default: '' },
    flightDate: { type: String, default: '' },
    flightTime: { type: String, default: '' },
    flightNumber: { type: String, default: '' },
    pickupPoint: { type: String, default: '' },
    dropLocation: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    vehicleSource: { type: String, enum: ['Own', 'Vendor'], default: 'Own' },
    vendorName: { type: String, default: '' },
    vendorCost: { type: Number, default: 0 },
    dutyAmount: { type: Number, default: 0 },
    status: { type: String, default: 'Scheduled' }, // Scheduled, Dispatched, Running, Completed, Cancelled
    rawSourceSheet: { type: String, default: '' },
    rawSourceRow: { type: Number, default: 0 },
    sourceRef: { type: String, default: '' },
    disposalHours: { type: Number, default: 8 },
    disposalKm: { type: Number, default: 80 },
    intercityRoute: { type: String, default: '' },
    remarks: { type: String, default: '' }
}, { _id: true });

const reconciliationAlertSchema = new mongoose.Schema({
    id: { type: String, default: '' },
    type: { type: String, default: 'duplicate' }, // duplicate, pickup_confirm, conflict
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    suggestedAction: { type: String, default: '' },
    status: { type: String, default: 'pending' }, // pending, resolved, ignored
    dutyId: { type: String, default: '' },
    sourceInfo: { type: String, default: '' }
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

    // Live Event Excel Spreadsheet Centre
    excelDuties: [excelDutySchema],
    reconciliationAlerts: [reconciliationAlertSchema],
    excelConfig: {
        departureLeadMinutes: { type: Number, default: 120 },
        stationLeadMinutes: { type: Number, default: 60 },
        defaultTurnaroundMinutes: { type: Number, default: 30 },
        disposalHours: { type: Number, default: 8 },
        disposalKm: { type: Number, default: 80 },
        intercityRouteNotes: { type: String, default: '' },
        timezone: { type: String, default: 'Asia/Kolkata' }
    },
    mappingTemplates: [{
        name: { type: String, required: true },
        headerRowIndex: { type: Number, default: 0 },
        columnMap: { type: mongoose.Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now }
    }],
    rawWorkbookRowsCount: { type: Number, default: 0 },
    uniqueGuestGroupsCount: { type: Number, default: 0 },

    // Quotation Rate Sheet Matrix (Car Name columns x Service Requirement rows)
    selectedCars: [{
        name: { type: String, required: true },
        subtitle: { type: String, default: '' }
    }],
    serviceRequirements: [{
        type: String
    }],
    rateMatrix: [{
        serviceName: { type: String, required: true },
        rates: { type: mongoose.Schema.Types.Mixed, default: {} }
    }],
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
