const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    status: { type: String, default: 'active' },
    vehicleLimit: { type: Number, default: 10 },
    website: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    ownerSignatureUrl: { type: String, default: '' },
    ownerName: { type: String, default: '' }
}, { timestamps: true });

// We specify the collection name explicitly to match the main CRM
module.exports = mongoose.model('Company', companySchema, 'companies');
