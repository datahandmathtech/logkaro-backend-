const connectDB = require('../src/config/db');
const Vehicle = require('../src/models/Vehicle');

async function cleanup() {
    await connectDB();
    const fleetVehs = await Vehicle.find({ isOutsideCar: { $ne: true } }).select('carNumber model status');
    const fleetPlates = fleetVehs.map(v => (v.carNumber || '').trim().toUpperCase());
    console.log(`Found ${fleetPlates.length} fleet cars.`);
    
    const outsideCars = await Vehicle.find({ isOutsideCar: true });
    console.log(`Found ${outsideCars.length} total outside car records.`);
    
    const glitchCarIds = [];
    outsideCars.forEach(o => {
        const plate = ((o.carNumber || '').split('#')[0] || '').trim().toUpperCase();
        if (fleetPlates.includes(plate)) {
            glitchCarIds.push(o._id);
        }
    });
    
    console.log(`Found ${glitchCarIds.length} glitch records that are company fleet cars.`);
    
    if (glitchCarIds.length > 0) {
        const res = await Vehicle.deleteMany({ _id: { $in: glitchCarIds } });
        console.log(`Successfully deleted ${res.deletedCount} glitch outside car records!`);
    } else {
        console.log('No glitch records to delete.');
    }
    
    const remainingOutside = await Vehicle.countDocuments({ isOutsideCar: true });
    console.log(`Remaining legitimate outside cars: ${remainingOutside}`);
    process.exit(0);
}

cleanup().catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
});
