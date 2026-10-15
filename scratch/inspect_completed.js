const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const completed = await Booking.find({ bookingStatus: 'Completed' }).limit(10).lean();
    console.log("Total completed in DB:", await Booking.countDocuments({ bookingStatus: 'Completed' }));
    
    completed.forEach((b, i) => {
        console.log(`\n--- Booking #${i+1} [${b.bookingId} / ${b.clientCode}] ---`);
        console.log("Client:", b.clientName, "Mobile:", b.mobileNumber);
        console.log("Vehicle Type:", b.vehicleType);
        console.log("Root pickupPoint:", b.pickupPoint, "dropPoint:", b.dropPoint, "route:", b.route);
        console.log("Dates:", b.travelStartDate, "->", b.travelEndDate);
        console.log("Amounts: Total=", b.totalAmount, "Adv=", b.advancePaid, "Bal=", b.balanceDue);
        if (b.itinerary && b.itinerary.length) {
            console.log(`Itinerary (${b.itinerary.length} days):`);
            b.itinerary.forEach(day => {
                console.log(`  Day ${day.dayNo}: duty="${day.duty}", vehNum="${day.vehicleNumber}", driver="${day.driverName}", pickup="${day.pickupPoint}", vehType="${day.vehicleType}"`);
            });
        } else {
            console.log("No itinerary days");
        }
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
