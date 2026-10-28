const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

async function check0160() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        const vehs = await Vehicle.find({ carNumber: { $regex: /0160/i } }).lean();
        console.log("Vehicles matching 0160 count:", vehs.length);
        vehs.forEach(v => {
            console.log(`- ID: ${v._id}, carNumber: "${v.carNumber}", isOutsideCar: ${v.isOutsideCar}, model: "${v.model}", status: "${v.status}", ownerName: "${v.ownerName}"`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check0160();
