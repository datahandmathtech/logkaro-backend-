const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Driver', 'Executive', 'Staff'], required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    vehicleLimit: { type: Number, default: 10 },
    permissions: {
        dashboard: { type: Boolean, default: true },
        liveFeed: { type: Boolean, default: true },
        logBook: { type: Boolean, default: true },
        driversService: { type: Boolean, default: true },
        fleetOperations: { type: Boolean, default: true },
        buySell: { type: Boolean, default: true },
        vehiclesManagement: { type: Boolean, default: true },
        staffManagement: { type: Boolean, default: true },
        manageAdmins: { type: Boolean, default: true },
        reports: { type: Boolean, default: true }
    }
}, { timestamps: true });

// Hash password before saving to main User collection
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Use 'users' collection explicitly
module.exports = mongoose.model('User', userSchema, 'users');
