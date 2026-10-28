const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();

  for (const c of collections) {
    const docs = await mongoose.connection.db.collection(c.name).find({
      $or: [
        { guestName: /Romesh/i },
        { customerName: /Romesh/i },
        { name: /Romesh/i },
        { clientName: /Romesh/i },
        { bookingCode: /10\/98/i },
        { bookingCode: /09\/38/i }
      ]
    }).toArray();
    if (docs.length > 0) {
      console.log(`=== FOUND in collection: ${c.name} (${docs.length} docs) ===`);
      docs.forEach(d => {
        console.log(JSON.stringify(d, null, 2));
      });
    }
  }
  process.exit(0);
}
run().catch(console.error);
