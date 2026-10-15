const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const companyId = new mongoose.Types.ObjectId('698ac8b01587e01651a49443');
    
    const completed = await Booking.find({ company: companyId, bookingStatus: 'Completed' }).lean();
    console.log("Total completed bookings:", completed.length);

    const monthCount = {};
    const codePrefixCount = {};
    let withItinCount = 0;
    let withVehNumCount = 0;
    let withDriverCount = 0;
    let withDutyCount = 0;

    completed.forEach(b => {
        const d = new Date(b.travelStartDate || b.travelEndDate || b.createdAt);
        const m = d.toLocaleString('en-US', { month: 'short' });
        monthCount[m] = (monthCount[m] || 0) + 1;

        const code = String(b.bookingCode || b.clientCode || b.bookingId || '');
        const pMatch = code.match(/^(\d{2})\//);
        const p = pMatch ? pMatch[1] : 'Other';
        codePrefixCount[p] = (codePrefixCount[p] || 0) + 1;

        if (Array.isArray(b.itinerary) && b.itinerary.length > 0) {
            withItinCount++;
            if (b.itinerary.some(i => i.vehicleNumber)) withVehNumCount++;
            if (b.itinerary.some(i => i.driverName)) withDriverCount++;
            if (b.itinerary.some(i => i.duty || i.route || i.description)) withDutyCount++;
        }
    });

    console.log("Breakdown by Travel Start Month:", monthCount);
    console.log("Breakdown by Code Prefix:", codePrefixCount);
    console.log(`With Itinerary: ${withItinCount}/${completed.length}`);
    console.log(`With Vehicle Number: ${withVehNumCount}/${completed.length}`);
    console.log(`With Driver Name: ${withDriverCount}/${completed.length}`);
    console.log(`With Duty/Route in Itinerary: ${withDutyCount}/${completed.length}`);

    // Print 10 sample duties
    console.log("\nSample duties / routes:");
    completed.slice(0, 10).forEach(b => {
        const code = b.bookingCode || b.clientCode || b.bookingId;
        const duties = (b.itinerary || []).map(i => i.duty || i.description).filter(Boolean);
        const vehNums = [...new Set((b.itinerary || []).map(i => i.vehicleNumber).filter(Boolean))];
        const drivers = [...new Set((b.itinerary || []).map(i => i.driverName).filter(Boolean))];
        console.log(`[${code}] Guest: ${b.clientName} | Car: ${b.vehicleType} | Plate: ${vehNums.join(', ') || 'None'} | Driver: ${drivers.join(', ') || 'None'} | Duties: [${duties.join(' -> ')}]`);
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
