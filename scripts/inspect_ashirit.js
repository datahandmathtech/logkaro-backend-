require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const booking = await db.collection('bookings').findOne({ clientName: /Ashirit/i });
        console.log('BOOKING:', JSON.stringify(booking, null, 2));

        if (booking) {
            const client = await db.collection('clients').findOne({ _id: booking.client });
            console.log('CLIENT:', JSON.stringify(client, null, 2));

            const ledgers = await db.collection('ledgerentries').find({ client: booking.client }).toArray();
            console.log('LEDGER ENTRIES:', JSON.stringify(ledgers, null, 2));

            const bankTxs = await db.collection('banktransactions').find({
                $or: [
                    { clientRef: booking.client },
                    { bookingRef: booking._id },
                    { description: /Ashirit/i }
                ]
            }).toArray();
            console.log('BANK TXS:', JSON.stringify(bankTxs, null, 2));

            const cashTxs = await db.collection('cashtransactions').find({
                $or: [
                    { clientRef: booking.client },
                    { bookingRef: booking._id },
                    { description: /Ashirit/i }
                ]
            }).toArray();
            console.log('CASH TXS:', JSON.stringify(cashTxs, null, 2));

            if (booking.lead) {
                const lead = await db.collection('leads').findOne({ _id: booking.lead });
                console.log('LEAD:', JSON.stringify(lead, null, 2));
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
