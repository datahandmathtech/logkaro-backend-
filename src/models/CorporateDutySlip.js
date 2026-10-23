const mongoose = require('mongoose');

const corporateDutySlipSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    contract: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CorporateContract',
        required: true,
        index: true
    },
    dutySlipNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
        // e.g. 'DS-2026-0001'
    },
    requestReference: {
        type: String,
        trim: true,
        default: ''
        // e.g. Corporate Ticket ID / PO # / Email Ref
    },
    dutyDate: {
        type: String, // YYYY-MM-DD
        required: true,
        index: true
    },
    dutyDateTime: {
        type: Date
    },
    dutyType: {
        type: String,
        required: true,
        trim: true
        // e.g. 'Airport Pickup/Drop', '4Hr / 40Km Local', '8Hr / 80Km Local', 'Outstation'
    },
    vehicleCategory: {
        type: String,
        default: 'Sedan',
        trim: true
    },
    // Vehicle & Driver
    vehicleNumber: {
        type: String,
        required: true,
        trim: true
    },
    vehicleModel: {
        type: String,
        default: ''
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    },
    driverName: {
        type: String,
        required: true,
        trim: true
    },
    driverMobile: {
        type: String,
        default: ''
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Guest / Employee Details
    guestDetails: {
        name: { type: String, default: '', trim: true },
        empId: { type: String, default: '', trim: true },
        department: { type: String, default: '', trim: true },
        mobile: { type: String, default: '' },
        email: { type: String, default: '' },
        passengerCount: { type: Number, default: 1 }
    },
    // Route & Itinerary
    pickupLocation: {
        type: String,
        required: true,
        trim: true
    },
    dropLocation: {
        type: String,
        required: true,
        trim: true
    },
    reportingAddress: {
        type: String,
        default: ''
    },
    // Execution Details (filled upon completion)
    execution: {
        startDateTime: { type: Date },
        endDateTime: { type: Date },
        openingKm: { type: Number, default: 0 },
        closingKm: { type: Number, default: 0 },
        totalKm: { type: Number, default: 0 },
        totalHours: { type: Number, default: 0 },
        garageKm: { type: Number, default: 0 },
        garageHours: { type: Number, default: 0 }
    },
    // Rate snapshot & Computed charges
    charges: {
        baseRate: { type: Number, default: 0 },
        includedKm: { type: Number, default: 0 },
        includedHours: { type: Number, default: 0 },
        extraKm: { type: Number, default: 0 },
        extraKmRate: { type: Number, default: 0 },
        extraKmAmount: { type: Number, default: 0 },
        extraHours: { type: Number, default: 0 },
        extraHourRate: { type: Number, default: 0 },
        extraHoursAmount: { type: Number, default: 0 },
        driverAllowance: { type: Number, default: 0 },
        nightCharge: { type: Number, default: 0 },
        tollAmount: { type: Number, default: 0 },
        parkingAmount: { type: Number, default: 0 },
        otherCharges: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        discountReason: { type: String, default: '' },
        subtotal: { type: Number, default: 0 },
        taxableAmount: { type: Number, default: 0 }
    },
    // Lifecycle Status
    status: {
        type: String,
        enum: ['Requested', 'Assigned', 'Completed', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Requested',
        index: true
    },
    // Corporate Approval / Sign-off
    approval: {
        approvedBy: { type: String, default: '' },
        approvalDate: { type: Date },
        designation: { type: String, default: '' },
        signatureUrl: { type: String, default: '' },
        signedSlipUrl: { type: String, default: '' },
        approvalStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        },
        approvalRemarks: { type: String, default: '' }
    },
    remarks: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

corporateDutySlipSchema.index({ company: 1, contract: 1, dutyDate: 1 });
corporateDutySlipSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('CorporateDutySlip', corporateDutySlipSchema);
