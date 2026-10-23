const mongoose = require('mongoose');

const corporateDailyRegisterSchema = new mongoose.Schema({
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
    date: {
        type: String, // YYYY-MM-DD for fast date-wise querying & aggregation
        required: true,
        index: true
    },
    dateObj: {
        type: Date
    },
    slotNumber: {
        type: Number,
        required: true
        // 1 to 20
    },
    // Planned / regular vehicle & driver
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
        default: '',
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
    shift: {
        type: String,
        default: 'General'
        // 'Morning', 'Evening', 'Night', 'Shift A', 'Shift B'
    },
    route: {
        type: String,
        default: ''
        // e.g. 'Route 1 - City to Plant'
    },
    // Operating details
    startKm: {
        type: Number,
        default: 0
    },
    endKm: {
        type: Number,
        default: 0
    },
    totalKm: {
        type: Number,
        default: 0
    },
    startTime: {
        type: String,
        default: ''
        // '08:00'
    },
    endTime: {
        type: String,
        default: ''
        // '20:00'
    },
    totalHours: {
        type: Number,
        default: 0
    },
    // Status of deployment
    status: {
        type: String,
        enum: ['Operated', 'Absent', 'Replacement'],
        default: 'Operated',
        index: true
    },
    // Replacement details if status === 'Replacement'
    replacementVehicleNumber: {
        type: String,
        default: '',
        trim: true
    },
    replacementVehicleModel: {
        type: String,
        default: ''
    },
    replacementDriverName: {
        type: String,
        default: '',
        trim: true
    },
    replacementDriverMobile: {
        type: String,
        default: ''
    },
    replacementReason: {
        type: String,
        default: ''
    },
    // Financial & Billing flag
    isBillable: {
        type: Boolean,
        default: true
    },
    dayRateSnapshot: {
        type: Number,
        default: 0 // Frozen rate per vehicle per day at time of record creation
    },
    extraKm: {
        type: Number,
        default: 0
    },
    extraKmAmount: {
        type: Number,
        default: 0
    },
    extraHours: {
        type: Number,
        default: 0
    },
    extraHoursAmount: {
        type: Number,
        default: 0
    },
    totalDayAmount: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String,
        default: ''
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Composite unique constraint: 1 contract cannot have duplicate slot on the same date
corporateDailyRegisterSchema.index({ contract: 1, date: 1, slotNumber: 1 }, { unique: true });
corporateDailyRegisterSchema.index({ company: 1, contract: 1, date: 1 });

module.exports = mongoose.model('CorporateDailyRegister', corporateDailyRegisterSchema);
