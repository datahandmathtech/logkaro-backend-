const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    carNumber: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    status: { type: String, default: 'active' },
    isOutsideCar: { type: Boolean, default: false }
}, { timestamps: true });

// Explicitly use 'vehicles' collection in main DB
module.exports = mongoose.model('Vehicle', vehicleSchema, 'vehicles');
