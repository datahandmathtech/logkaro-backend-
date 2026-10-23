const mongoose = require('mongoose');

const corporateMonthlyStatementSchema = new mongoose.Schema({
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
    clientName: {
        type: String,
        required: true
    },
    month: {
        type: Number, // 1 to 12
        required: true
    },
    year: {
        type: Number, // e.g. 2026
        required: true
    },
    statementNumber: {
        type: String,
        required: true,
        unique: true
        // e.g. 'CORP-STMT-2026-10-001'
    },
    billingPeriod: {
        startDate: { type: String }, // YYYY-MM-DD
        endDate: { type: String }
    },
    // Section A: Regular Transport Summary
    regularTransportSummary: {
        contractedVehiclesPerDay: { type: Number, default: 20 },
        totalCalendarDays: { type: Number, default: 31 },
        totalContractedVehicleDays: { type: Number, default: 0 },
        operatedVehicleDays: { type: Number, default: 0 },
        absentVehicleDays: { type: Number, default: 0 },
        replacementVehicleDays: { type: Number, default: 0 },
        ratePerVehicleDay: { type: Number, default: 0 },
        totalRegularAmount: { type: Number, default: 0 },
        totalExtraKmAmount: { type: Number, default: 0 },
        totalExtraHoursAmount: { type: Number, default: 0 },
        totalRegularSectionAmount: { type: Number, default: 0 }
    },
    // Section B: On-Call Duties Summary
    onCallDutiesSummary: {
        totalDutiesCount: { type: Number, default: 0 },
        approvedDutiesCount: { type: Number, default: 0 },
        pendingApprovalCount: { type: Number, default: 0 },
        totalBaseAmount: { type: Number, default: 0 },
        totalExtraKmAmount: { type: Number, default: 0 },
        totalExtraHoursAmount: { type: Number, default: 0 },
        totalTollParking: { type: Number, default: 0 },
        totalDriverAllowance: { type: Number, default: 0 },
        totalOnCallAmount: { type: Number, default: 0 }
    },
    // Overall Statement Calculation
    grossAmount: {
        type: Number,
        default: 0
    },
    adjustments: {
        type: Number,
        default: 0
    },
    adjustmentReason: {
        type: String,
        default: ''
    },
    taxableAmount: {
        type: Number,
        default: 0
    },
    gstRate: {
        type: Number,
        default: 5 // 5%, 12%, 18%
    },
    gstAmount: {
        type: Number,
        default: 0
    },
    totalInvoiceAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Verified', 'Locked', 'Invoiced'],
        default: 'Draft',
        index: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedAt: {
        type: Date
    },
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    invoiceRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    invoiceNumber: {
        type: String,
        default: ''
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

corporateMonthlyStatementSchema.index({ company: 1, contract: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('CorporateMonthlyStatement', corporateMonthlyStatementSchema);
