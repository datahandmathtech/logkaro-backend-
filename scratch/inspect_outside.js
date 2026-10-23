require('dotenv').config();
const m = require('mongoose');
const V = require('../src/models/Vehicle');
m.connect(process.env.MONGODB_URI).then(async () => {
    const vs = await V.find({ carNumber: /^(1473|2364|9157|A\/F|AF NEW)/i }).select('carNumber model company isOutsideCar vehicleSource transactionType eventId status ownerName guestName').lean();
    console.log(JSON.stringify(vs, null, 1));
    const c = await V.aggregate([{ $match: { isOutsideCar: true } }, { $group: { _id: { src: '$vehicleSource', tt: '$transactionType' }, n: { $sum: 1 } } }]);
    console.log(c);
    process.exit();
});
