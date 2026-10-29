const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        default: 'active'
    },
    vehicleLimit: {
        type: Number,
        default: 10
    },
    website: {
        type: String,
        default: 'www.fleetmanagement.com'
    },
    ownerName: {
        type: String,
        default: 'AUTHORIZED MANAGER'
    },
    logoUrl: {
        type: String,
        default: '/logos/logo.png'
    },
    ownerSignatureUrl: {
        type: String,
        default: '/logos/signature.png'
    },
    whatsappNumber: {
        type: String
    },
    gstRate: {
        type: Number,
        default: 5
    },
    gstNumber: {
        type: String,
        default: ''
    },
    leadSources: {
        type: [String],
        default: [
            'Website', 'Google Ads', 'Repeat Guest', 'Hotel', 'Referral',
            'Walk-in', 'B2B/Agent', 'Social Media', 'JustDial', 'Other'
        ]
    },
    cashBalance: {
        type: Number,
        default: 0
    },
    // 🌟 Advanced Multi-Tenant Feature Configuration (Managed via SuperAdmin)
    businessModel: {
        type: String,
        enum: ['B2B', 'B2C', 'Both'],
        default: 'Both'
    },
    appAccess: {
        type: Object,
        default: () => ({
            adminPortal: true,
            driverPortal: true,
            clientPortal: false
        })
    },
    driverAppSettings: {
        type: Object,
        default: () => ({
            photoUploadCount: 2,
            requireMeterReading: true,
            allowSelfPunch: true
        })
    },
    operationalSettings: {
        type: Object,
        default: () => ({
            parking: { enabled: true, trackPayment: true },
            fuel: { enabled: true, requireKmReading: true },
            outsideCars: { enabled: true },
            borderTax: { enabled: true },
            fastag: { enabled: true },
            maintenance: { enabled: true },
            leads: { enabled: true },
            drs: { enabled: true },
            invoices: { enabled: true }
        })
    },
    salarySettings: {
        type: Object,
        default: () => ({
            salaryType: 'monthly',
            monthlyLeaveAllowance: 2,
            carryForwardLeaves: false,
            dayAllowance: { enabled: true, defaultAmount: 200 },
            nightAllowance: { enabled: true, defaultAmount: 250 }
        })
    }
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Company', companySchema);
