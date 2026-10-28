const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

async function inspectVeh() {
    try {
        await connectDB();
        while (mongoose.connection.readyState !== 1) await new Promise(r => setTimeout(r, 200));

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        const doc = await Vehicle.findById('6ae05266a809a4c9bcfd3de0').lean();
        console.log("Full Vehicle document 6ae05266a809a4c9bcfd3de0:");
        console.log(JSON.stringify(doc, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectVeh();
