const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

function normalizePlate(str) {
    return String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function extractDigits(str) {
    const m = String(str || '').match(/\d{3,4}/);
    return m ? m[0] : '';
}

async function inspectAllOutsideCars() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

        const fleetVehicles = await Vehicle.find({ isOutsideCar: { $ne: true } }).lean();
        console.log(`Company Fleet Vehicles: ${fleetVehicles.length}`);

        const fleetByDigits = {};
        fleetVehicles.forEach(fv => {
            const digits = extractDigits(fv.carNumber);
            if (digits) {
                if (!fleetByDigits[digits]) fleetByDigits[digits] = [];
                fleetByDigits[digits].push(fv);
            }
        });

        const outsideVehicles = await Vehicle.find({ isOutsideCar: true }).lean();
        console.log(`Total Outside Vehicles: ${outsideVehicles.length}`);

        const suspectFleetCars = [];

        outsideVehicles.forEach(ov => {
            const rawPlate = (ov.carNumber || '').split('#')[0].trim();
            const norm = normalizePlate(rawPlate);
            const digits = extractDigits(rawPlate);

            // Check if matches fleet plate directly
            const directMatch = fleetVehicles.find(fv => normalizePlate(fv.carNumber) === norm);
            if (directMatch) {
                suspectFleetCars.push({ ov, matchType: 'Exact Plate', fleetCar: directMatch.carNumber });
                return;
            }

            // Check if matches fleet 4-digit number and model or name
            if (digits && fleetByDigits[digits] && fleetByDigits[digits].length === 1) {
                const fv = fleetByDigits[digits][0];
                const rawUpper = rawPlate.toUpperCase();
                const fvModel = (fv.model || fv.carType || '').toUpperCase();
                // e.g. "CIAZ - 0160" and fv is CIAZ with 0160
                if (fvModel && (rawUpper.includes(fvModel) || fvModel.includes(rawUpper.replace(/[^A-Z]/g, '')))) {
                    suspectFleetCars.push({ ov, matchType: 'Model+Digits Match', fleetCar: `${fv.carNumber} (${fv.model})` });
                    return;
                }
                // or if rawPlate is just the 4 digits or "MODEL 4DIGITS"
                if (rawUpper.includes(digits) && (rawUpper.includes('CIAZ') || rawUpper.includes('CRYSTA') || rawUpper.includes('INNOVA') || rawUpper.includes('DEZIRE') || rawUpper.includes('DZIRE') || rawUpper.includes('ETIOS') || rawUpper.includes('ERTIGA'))) {
                    suspectFleetCars.push({ ov, matchType: 'Known Fleet Car', fleetCar: `${fv.carNumber} (${fv.model})` });
                    return;
                }
            }
        });

        console.log(`\nFound ${suspectFleetCars.length} suspect fleet cars in Outside Cars:`);
        suspectFleetCars.forEach(s => {
            console.log(`- ID: ${s.ov._id} | Car: "${s.ov.carNumber}" | Match: ${s.matchType} -> ${s.fleetCar} | Guest: ${s.ov.guestName}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectAllOutsideCars();
