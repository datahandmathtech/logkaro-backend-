const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;

    const txId = new mongoose.Types.ObjectId('6ab506e4cc4ef2ac5d003273');
    const tx = await db.collection('banktransactions').findOne({ _id: txId });
    console.log('Current BankTx date:', tx.date);

    await db.collection('banktransactions').updateOne(
        { _id: txId },
        { $set: { date: new Date('2026-09-24T00:00:00.000Z') } }
    );
    console.log('Updated BankTx date to 2026-09-24');

    if (tx.bookingRef) {
        await db.collection('bookings').updateOne(
            { _id: tx.bookingRef },
            { $set: { advanceDate: new Date('2026-09-24T00:00:00.000Z') } }
        );
        console.log('Updated Booking advanceDate to 2026-09-24');
    }

    // Verify bank account
    const bank = await db.collection('bankaccounts').findOne({ _id: tx.bankAccount });
    console.log('Bank account:', bank?.bankName, bank?.accountNumber);

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
