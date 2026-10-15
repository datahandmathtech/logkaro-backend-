const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connStr = process.env.MONGODB_URI;
mongoose.connect(connStr).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const statuses = await Booking.aggregate([{ $group: { _id: "$bookingStatus", count: { $sum: 1 } } }]);
    console.log("Statuses in DB:", statuses);

    const completed = await Booking.find({ bookingStatus: { $in: ['Completed', 'Invoiced', 'Closed'] } }).limit(5).lean();
    console.log("Found completed count (limit 5):", completed.length);
    completed.forEach(b => {
        console.log(JSON.stringify({
            bookingId: b.bookingId,
            clientCode: b.clientCode,
            bookingCode: b.bookingCode,
            status: b.bookingStatus,
            vehicleType: b.vehicleType,
            assignedVehicle: b.assignedVehicle,
            vehicleNumber: b.vehicleNumber,
            driverName: b.driverName,
            pickupPoint: b.pickupPoint,
            dropPoint: b.dropPoint,
            source: b.source,
            route: b.route,
            itinerary: b.itinerary?.map(i => ({
                dayNo: i.dayNo,
                date: i.date,
                duty: i.duty,
                pickupPoint: i.pickupPoint,
                vehicleType: i.vehicleType,
                vehicleNumber: i.vehicleNumber,
                driverName: i.driverName,
                description: i.description,
                route: i.route
            }))
        }, null, 2));
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
