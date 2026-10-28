const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/yatree';

mongoose.connect(uri).then(async () => {
    const bId = '6ac39bdb8e5a7d45a1fd14ee';
    const Ledgers = mongoose.connection.collection('clientledgers');
    const lList = await Ledgers.find({
        $or: [{ bookingId: '10/29' }, { bookingRef: new mongoose.Types.ObjectId(bId) }, { clientName: /Kurawat/i }]
    }).toArray();
    console.log('Client Ledgers:', JSON.stringify(lList, null, 2));

    const DRS = mongoose.connection.collection('drsduties');
    const dList = await DRS.find({
        $or: [{ bookingId: '10/29' }, { clientName: /Kurawat/i }]
    }).toArray();
    console.log('DRS Duties:', JSON.stringify(dList, null, 2));

    const Invoices = mongoose.connection.collection('invoices');
    const invList = await Invoices.find({
        $or: [{ bookingId: '10/29' }, { invoiceNumber: /00018/i }]
    }).toArray();
    console.log('Invoices:', JSON.stringify(invList, null, 2));

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
