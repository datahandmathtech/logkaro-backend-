const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    const docs = await col.find({
      $or: [
        { amount: 2860 },
        { amount: 4300 }
      ]
    }).toArray();
    if (docs && docs.length > 0) {
      console.log('Found in collection:', col.collectionName, docs);
    }
  }
  process.exit(0);
}
run();
