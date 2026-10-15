const mongoose = require('mongoose');

async function fixAll() {
    const uris = [
        { name: 'Main Fleet', uri: 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true' },
        { name: 'Modified Fleet', uri: 'mongodb://abhinandan9822_db_user:bmRK2asB2WA9guOw@ac-crupkmd-shard-00-00.iienpcd.mongodb.net:27017,ac-crupkmd-shard-00-01.iienpcd.mongodb.net:27017,ac-crupkmd-shard-00-02.iienpcd.mongodb.net:27017/taxi-fleet?ssl=true&authSource=admin&retryWrites=true&w=majority' },
        { name: 'School CRM', uri: 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/school-transport?authSource=admin&tls=true' }
    ];

    for (let dbConfig of uris) {
        console.log("\\n--- Scanning " + dbConfig.name + " ---");
        try {
            await mongoose.connect(dbConfig.uri);
            const db = mongoose.connection.db;
            
            const bookings = await db.collection('bookings').find({ advancePaid: { $gt: 0 } }).toArray();
            console.log("Found " + bookings.length + " bookings with advance > 0");
            
            let fixedCount = 0;
            for (let b of bookings) {
                const txs = await db.collection('banktransactions').find({ bookingRef: b._id }).toArray();
                
                let actualAdvance = 0;
                for (let tx of txs) {
                    if (tx.type === 'IN') actualAdvance += tx.amount;
                    if (tx.type === 'OUT') actualAdvance -= tx.amount;
                }
                actualAdvance = Math.max(0, actualAdvance);
                
                if (actualAdvance !== b.advancePaid) {
                    console.log("Booking " + b._id + " (Client: " + b.clientName + "): advancePaid is " + b.advancePaid + ", but true sum of bank transactions is " + actualAdvance + ". Fixing to " + actualAdvance + "...");
                    await db.collection('bookings').updateOne({ _id: b._id }, { $set: { advancePaid: actualAdvance } });
                    fixedCount++;
                }
            }
            console.log(dbConfig.name + ": Fixed " + fixedCount + " orphaned bookings.");
            await mongoose.disconnect();
        } catch (e) {
            console.error("Error scanning " + dbConfig.name + ":", e.message);
        }
    }
}
fixAll();
