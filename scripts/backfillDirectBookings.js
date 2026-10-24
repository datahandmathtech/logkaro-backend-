const mongoose = require('mongoose');
require('dotenv').config({ path: 'src/.env' });
if (!process.env.MONGODB_URI) require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
    
    const unlinked = await Booking.find({ lead: null });
    console.log('Found unlinked bookings:', unlinked.length);
    for (const b of unlinked) {
        // Check if a lead exists with this bookingId or clientCode
        let existingLead = await Lead.findOne({
            company: b.company,
            $or: [
                { bookingId: b.bookingId },
                { clientCode: b.clientCode },
                { leadId: b.bookingId },
                { leadId: b.clientCode }
            ]
        });
        if (existingLead) {
            b.lead = existingLead._id;
            await b.save();
            console.log('Linked to existing lead:', b.bookingId, existingLead._id);
        } else {
            const dutyDate = b.travelStartDate || b.bookingDate || b.createdAt;
            const newLead = await Lead.create({
                leadId: b.clientCode || b.bookingId,
                clientCode: b.clientCode || b.bookingId,
                company: b.company,
                client: b.client,
                clientName: b.clientName || 'Guest (TBA)',
                mobileNumber: b.mobileNumber || 'TBA',
                salesPerson: b.salesPerson || 'Operations',
                bookingReference: 'Direct',
                source: b.source || 'Live DRS Direct Booking',
                leadDate: dutyDate,
                advanceDate: (Number(b.advancePaid) > 0) ? (b.advanceDate || dutyDate) : dutyDate,
                advanceAmount: b.advancePaid || 0,
                totalAmount: b.totalAmount || b.packagePrice || 0,
                status: 'Confirmed',
                priority: 'High',
                bookingId: b.clientCode || b.bookingId,
                travelStartDate: b.travelStartDate,
                travelEndDate: b.travelEndDate,
                vehicleType: b.vehicleType || 'Sedan',
                createdAt: b.createdAt
            });
            b.lead = newLead._id;
            await b.save();
            console.log('Created new confirmed Lead for direct booking:', b.bookingId, b.totalAmount, newLead._id);
        }
    }
    console.log('All unlinked bookings synchronized successfully!');
    process.exit(0);
}
run().catch(err => {
    console.error('Backfill error:', err);
    process.exit(1);
});
