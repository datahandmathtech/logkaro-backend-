const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    
    const companies = await Company.find({}).lean();
    console.log("Companies:", companies.map(c => ({ id: c._id, name: c.name })));

    for (const c of companies) {
        const totalBkgs = await Booking.countDocuments({ company: c._id });
        const completedBkgs = await Booking.countDocuments({ company: c._id, bookingStatus: 'Completed' });
        const confirmedBkgs = await Booking.countDocuments({ company: c._id, bookingStatus: 'Confirmed' });
        console.log(`Company "${c.name}" [${c._id}]: Total=${totalBkgs}, Completed=${completedBkgs}, Confirmed=${confirmedBkgs}`);

        const sampleCompleted = await Booking.find({ company: c._id, bookingStatus: 'Completed' }).sort({ travelStartDate: -1 }).limit(3).lean();
        sampleCompleted.forEach(b => {
            console.log(`   Completed: ${b.bookingId} (${b.clientCode}) | ${b.clientName} | ${b.vehicleType} | travel: ${b.travelStartDate} to ${b.travelEndDate}`);
        });
    }

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
