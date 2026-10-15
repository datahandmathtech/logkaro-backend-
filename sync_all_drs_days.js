const mongoose = require('mongoose');
require('dotenv').config();

async function syncAllBookingsToDRS() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));

    const bkgs = await Booking.find({ bookingStatus: { $ne: 'Cancelled' } });
    console.log(`Checking ${bkgs.length} active bookings...`);

    let createdCount = 0;
    for (const b of bkgs) {
        if (!b.travelStartDate) continue;

        const start = new Date(b.travelStartDate);
        const end = b.travelEndDate ? new Date(b.travelEndDate) : start;
        const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

        const existingDuties = await DRSDuty.find({
            $or: [{ bookingRef: b._id }, { bookingId: b.bookingId }]
        });

        // For each day from 0 to totalDays - 1
        for (let i = 0; i < totalDays; i++) {
            const dayDate = new Date(start);
            dayDate.setDate(start.getDate() + i);
            const dateStr = dayDate.toISOString().split('T')[0];
            const dayNo = i + 1;

            // Check if duty exists for this date or dayNo
            const hasDuty = existingDuties.some(d => {
                const dDateStr = d.date ? new Date(d.date).toISOString().split('T')[0] : null;
                return dDateStr === dateStr || d.dayNo === dayNo;
            });

            if (!hasDuty) {
                const itinDay = Array.isArray(b.itinerary) && b.itinerary[i] ? b.itinerary[i] : null;
                const dutyText = itinDay?.duty || itinDay?.description || (i === 0 ? 'Airport Pickup & Local Sightseeing' : (i === totalDays - 1 ? 'City Local & Station Drop' : 'City Tour / Sightseeing'));
                
                // Inherit vehicle / driver from previous day if available
                const prevDuty = existingDuties.length > 0 ? existingDuties[0] : null;

                const newD = await DRSDuty.create({
                    company: b.company,
                    bookingRef: b._id,
                    bookingId: b.bookingId,
                    leadId: b.lead || null,
                    clientName: b.clientName || 'Guest (TBA)',
                    mobileNumber: b.mobileNumber || '',
                    hotel: b.source || 'Direct',
                    date: dayDate,
                    time: itinDay?.time || '09:00 AM',
                    pickupPoint: itinDay?.pickupPoint || '',
                    duty: dutyText,
                    itinerary: dutyText,
                    dayNo: dayNo,
                    carType: itinDay?.vehicleType || b.vehicleType || 'Sedan',
                    revenue: itinDay?.amount || 0,
                    driver: prevDuty?.driver || null,
                    customDriverName: prevDuty?.customDriverName || '',
                    vehicle: prevDuty?.vehicle || null,
                    customCarNumber: prevDuty?.customCarNumber || '',
                    status: (prevDuty?.driver || prevDuty?.customDriverName) ? 'Assigned' : 'Scheduled',
                    isDirectBooking: true
                });

                console.log(`Created missing DRS duty for Booking ${b.bookingId} (${b.clientName}) Day ${dayNo} on ${dateStr}`);
                createdCount++;
            }
        }
    }

    console.log(`Sync complete! Created ${createdCount} missing DRS duties across active bookings.`);
    await mongoose.disconnect();
}
syncAllBookingsToDRS();
