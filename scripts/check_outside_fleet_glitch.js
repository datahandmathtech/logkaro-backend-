const connectDB = require('../src/config/db');
const Vehicle = require('../src/models/Vehicle');

async function test() {
    await connectDB();
    const fleetVehs = await Vehicle.find({ isOutsideCar: { $ne: true } }).select('carNumber model status');
    const fleetPlates = fleetVehs.map(v => (v.carNumber || '').trim().toUpperCase());
    const outsideCars = await Vehicle.find({ isOutsideCar: true });
    
    const glitchCars = outsideCars.filter(o => {
        const plate = ((o.carNumber || '').split('#')[0] || '').trim().toUpperCase();
        return fleetPlates.includes(plate);
    });
    
    console.log('Sample glitch cars:');
    glitchCars.slice(0, 10).forEach(g => {
        console.log({
            id: g._id,
            carNumber: g.carNumber,
            guestName: g.guestName,
            ownerName: g.ownerName,
            buyAmount: g.buyAmount,
            dutyAmount: g.dutyAmount,
            transactionType: g.transactionType,
            vehicleSource: g.vehicleSource
        });
    });
    process.exit(0);
}
test();
