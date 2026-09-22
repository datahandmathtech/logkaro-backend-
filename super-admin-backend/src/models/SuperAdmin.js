const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const superAdminSchema = new mongoose.Schema({
    name: { type: String, required: true, default: 'Super Admin' },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: 'superadmin', immutable: true },
    lastLoginAt: { type: Date },
}, { timestamps: true });

superAdminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

superAdminSchema.methods.matchPassword = async function (entered) {
    return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
