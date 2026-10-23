const mongoose = require('mongoose');

const rateCardItemSchema = new mongoose.Schema({
    dutyType: {
        type: String,
        required: true,
        trim: true
        // e.g. 'Airport Pickup/Drop', 'Railway Station Drop', '4Hr / 40Km Local', '8Hr / 80Km Local', '12Hr / 120Km Local', 'Outstation'
    },
    vehicleCategory: {
        type: String,
        default: 'Sedan',
        trim: true
        // e.g. 'Sedan (Dzire/Etios)', 'SUV (Ertiga)', 'Innova Crysta', 'Tempo Traveller'
    },
    baseRate: {
        type: Number,
        required: true,
        default: 0
    },
    includedKm: {
        type: Number,
        default: 0
    },
    includedHours: {
        type: Number,
        default: 0
    },
    extraKmRate: {
        type: Number,
        default: 0
    },
    extraHourRate: {
        type: Number,
        default: 0
    },
    driverAllowancePerDay: {
        type: Number,
        default: 0
    },
    nightCharge: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String,
        default: ''
    }
}, { _id: true });

const defaultVehicleSchema = new mongoose.Schema({
    slotNumber: {
        type: Number,
        required: true
    },
    vehicleNumber: {
        type: String,
        default: '',
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
        default: ''
    },
    driverMobile: {
        type: String,
        default: ''
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    defaultRoute: {
        type: String,
        default: ''
    },
    defaultShift: {
        type: String,
        default: 'General'
    }
}, { _id: true });

const corporateContractSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    clientRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    clientName: {
        type: String,
        required: true,
        trim: true
    },
    clientCode: {
        type: String,
        trim: true
    },
    contactPerson: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        designation: { type: String, default: '' }
    },
    billingAddress: {
        type: String,
        default: ''
    },
    gstin: {
        type: String,
        trim: true,
        default: ''
    },
    contractStartDate: {
        type: Date,
        required: true
    },
    contractEndDate: {
        type: Date,
        required: true
    },
    billingCycle: {
        type: String,
        default: '1st to End of Month'
        // '1st to End of Month', '16th to 15th', '26th to 25th'
    },
    status: {
        type: String,
        enum: ['Active', 'Draft', 'Expired', 'Terminated'],
        default: 'Active',
        index: true
    },
    // Daily regular fleet deployment settings
    contractedVehiclesCount: {
        type: Number,
        required: true,
        default: 20
    },
    regularRateConfig: {
        rateType: {
            type: String,
            enum: ['PerVehiclePerDay', 'FixedMonthlyPerVehicle', 'TotalFixedMonthly'],
            default: 'PerVehiclePerDay'
        },
        amount: {
            type: Number,
            required: true,
            default: 2500 // e.g. Rs 2,500/day/vehicle or Rs 60,000/month/vehicle
        },
        includedHoursPerDay: {
            type: Number,
            default: 12
        },
        includedKmPerDay: {
            type: Number,
            default: 100
        },
        extraKmRate: {
            type: Number,
            default: 14
        },
        extraHourRate: {
            type: Number,
            default: 150
        },
        billingDaysPerMonth: {
            type: Number,
            default: 26 // e.g. 26 working days or 30/31 calendar days
        }
    },
    // Pre-configured 20 regular deployment vehicles
    defaultVehicles: [defaultVehicleSchema],

    // On-call agreed rate card by duty type
    rateCard: [rateCardItemSchema],

    termsAndConditions: {
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

corporateContractSchema.index({ company: 1, status: 1 });
corporateContractSchema.index({ company: 1, clientName: 1 });

module.exports = mongoose.model('CorporateContract', corporateContractSchema);
