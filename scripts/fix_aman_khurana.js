require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const bkgId = new mongoose.Types.ObjectId('6aaceb80b5445e479ce13281');
        const leadId = new mongoose.Types.ObjectId('6aabbfc6fecfd628912bff67');
        const clientId = new mongoose.Types.ObjectId('6aaceb80b5445e479ce13271');

        // 1. Delete test entries (5000 and 3500)
        await db.collection('ledgerentries').deleteMany({
            _id: { $in: [
                new mongoose.Types.ObjectId('6ad8fe31cfaddcce36608122'),
                new mongoose.Types.ObjectId('6ad8fe96cfaddcce366081d0')
            ]}
        });
        await db.collection('banktransactions').deleteMany({
            _id: new mongoose.Types.ObjectId('6ad8fe96cfaddcce366081d3')
        });

        // 2. Update advance LedgerEntry to 500, HDFC, date: 2026-09-18
        await db.collection('ledgerentries').updateOne(
            { _id: new mongoose.Types.ObjectId('6aaceb80b5445e479ce13275') },
            {
                $set: {
                    amount: 500,
                    date: new Date('2026-09-18T00:00:00.000Z'),
                    bankName: 'HDFC',
                    paymentMode: 'HDFC',
                    description: 'Advance received for Booking LK-BKG-2026-00011 (09/12) via HDFC',
                    referenceId: bkgId
                }
            }
        );

        // 3. Update Booking
        await db.collection('bookings').updateOne(
            { _id: bkgId },
            {
                $set: {
                    advancePaid: 1500,
                    balanceDue: 8500,
                    paymentStatus: 'Partial',
                    advanceDate: new Date('2026-09-18T00:00:00.000Z'),
                    bankName: 'HDFC'
                }
            }
        );

        // 4. Update Lead
        await db.collection('leads').updateOne(
            { _id: leadId },
            {
                $set: {
                    advancePayment: 500,
                    advanceDate: new Date('2026-09-18T00:00:00.000Z')
                }
            }
        );

        // 5. Update Client
        await db.collection('clients').updateOne(
            { _id: clientId },
            {
                $set: {
                    totalBilled: 10000,
                    totalPaid: 1500,
                    balance: 8500
                }
            }
        );

        console.log('Cleanup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
})();
