const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

function normalizePlate(str) {
    return String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

async function cleanAllNormalizedDuplicates() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

        const fleetVehicles = await Vehicle.find({ isOutsideCar: { $ne: true } }).lean();
        const fleetNormSet = new Set(fleetVehicles.map(v => normalizePlate(v.carNumber)).filter(Boolean));

        const outsideVehicles = await Vehicle.find({ isOutsideCar: true }).lean();
        const toDeleteIds = [];

        outsideVehicles.forEach(ov => {
            const rawPlate = (ov.carNumber || '').split('#')[0];
            const norm = normalizePlate(rawPlate);
            if (fleetNormSet.has(norm)) {
                toDeleteIds.push(ov._id);
            }
        });

        console.log(`Found ${toDeleteIds.length} duplicate outside cars to delete.`);
        if (toDeleteIds.length > 0) {
            const res = await Vehicle.deleteMany({ _id: { $in: toDeleteIds } });
            console.log(`Successfully deleted ${res.deletedCount} duplicate records.`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanAllNormalizedDuplicates();
