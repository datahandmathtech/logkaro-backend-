const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const companyId = new mongoose.Types.ObjectId('698ac8b01587e01651a49443');
    
    const bkgs = await Booking.find({ company: companyId }).limit(10).lean();
    bkgs.forEach(b => {
        console.log({
            _id: b._id,
            bookingId: b.bookingId,
            bookingCode: b.bookingCode,
            clientCode: b.clientCode,
            status: b.bookingStatus,
            clientName: b.clientName
        });
    });

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
