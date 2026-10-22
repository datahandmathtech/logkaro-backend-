const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
require('./src/models/Lead');
require('./src/models/Client');
const Booking = require('./src/models/Booking');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const bkgs = await Booking.find({ company: '698ac8b01587e01651a49443', bookingStatus: { $in: ['Completed', 'Invoiced'] } })
        .populate('lead', 'leadId status totalAmount remarksHistory specialRemarks')
        .populate('client', 'name mobile balance');
    const gj = bkgs.find(b => b.clientName && b.clientName.includes('Ganesh'));
    console.log('Ganesh Jain in completed query:');
    console.log('totalAmount:', gj?.totalAmount, 'packagePrice:', gj?.packagePrice, 'advancePaid:', gj?.advancePaid, 'balanceDue:', gj?.balanceDue);
    console.log('lead totalAmount:', gj?.lead?.totalAmount);
    console.log('itinerary amounts:', gj?.itinerary?.map(i => i.amount));
    await mongoose.disconnect();
})();
