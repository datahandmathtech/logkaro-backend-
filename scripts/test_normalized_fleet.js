const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

function normalizePlate(str) {
    return String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

async function findNormalizedDuplicates() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

        // 1. Get all company fleet vehicles (isOutsideCar !== true)
        const fleetVehicles = await Vehicle.find({ isOutsideCar: { $ne: true } }).lean();
        console.log(`Total Company Fleet Vehicles: ${fleetVehicles.length}`);

        const fleetNormSet = new Set();
        const fleetMap = {};
        fleetVehicles.forEach(v => {
            const norm = normalizePlate(v.carNumber);
            if (norm) {
                fleetNormSet.add(norm);
                fleetMap[norm] = v.carNumber;
            }
        });
        console.log(`Unique Normalized Fleet Plates: ${fleetNormSet.size}`);

        // 2. Find all outside vehicles
        const outsideVehicles = await Vehicle.find({ isOutsideCar: true }).lean();
        console.log(`Total Outside Vehicles in DB: ${outsideVehicles.length}`);

        const matches = [];
        outsideVehicles.forEach(ov => {
            const rawPlate = (ov.carNumber || '').split('#')[0];
            const norm = normalizePlate(rawPlate);
            if (fleetNormSet.has(norm)) {
                matches.push({
                    _id: ov._id,
                    carNumber: ov.carNumber,
                    rawPlate,
                    matchedFleetCar: fleetMap[norm],
                    ownerName: ov.ownerName,
                    guestName: ov.guestName
                });
            }
        });

        console.log(`\nFOUND ${matches.length} OUTSIDE CARS THAT ARE ACTUALLY COMPANY FLEET VEHICLES!`);
        matches.slice(0, 20).forEach(m => {
            console.log(`- ID: ${m._id} | Car: ${m.carNumber} | Matched Fleet: ${m.matchedFleetCar} | Guest: ${m.guestName} | Owner: ${m.ownerName}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findNormalizedDuplicates();
