const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    
    // Find bookings that have Cancelled in notes but status is Completed
    const cancelledInNotes = await Booking.find({
        bookingStatus: 'Completed',
        notes: { $regex: /cancelled/i }
    });

    console.log(`Found ${cancelledInNotes.length} bookings marked as Completed but have Cancelled in notes:`);
    for (const b of cancelledInNotes) {
        console.log(`Fixing ${b.bookingId} (${b.clientCode}): notes="${b.notes}" -> setting bookingStatus to 'Cancelled'`);
        b.bookingStatus = 'Cancelled';
        await b.save();
    }

    console.log("Fix completed successfully.");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
