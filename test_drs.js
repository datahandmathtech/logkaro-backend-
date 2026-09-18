const mongoose = require('mongoose');
const Booking = require('e:/New folder/Master-Server/TEXI/yatree-backend/src/models/Booking');
const DRSDuty = require('e:/New folder/Master-Server/TEXI/yatree-backend/src/models/DRSDuty');
require('dotenv').config({ path: 'e:/New folder/Master-Server/TEXI/yatree-backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const b = await Booking.findOne({ bookingCode: '09/14' });
    console.log('BKG ID:', b?._id, 'Code:', b?.bookingCode, 'Start:', b?.travelStartDate);
    if(b) {
        const d = await DRSDuty.find({ bookingRef: b._id });
        console.log('DRS count:', d.length);
        d.forEach(dx => console.log('Date:', dx.date, 'Status:', dx.status, 'Day:', dx.dayNo));
    }
    process.exit();
}
run();
