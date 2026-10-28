const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/yatree';

mongoose.connect(uri).then(async () => {
    const Lead = mongoose.connection.collection('leads');
    const l = await Lead.findOne({ _id: new mongoose.Types.ObjectId('6ac36dc68e5a7d45a1fc7984') });
    console.log('Lead:', JSON.stringify(l, null, 2));

    const Logs = mongoose.connection.collection('activitylogs');
    if (Logs) {
        const logs = await Logs.find({ bookingId: '10/29' }).toArray();
        console.log('Logs:', JSON.stringify(logs, null, 2));
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
