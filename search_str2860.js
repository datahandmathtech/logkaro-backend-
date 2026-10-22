const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    const cursor = col.find({});
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const str = JSON.stringify(doc);
      if (str.includes('2860')) {
        console.log('Collection ' + col.collectionName + ' has 2860:', doc);
      }
    }
  }
  console.log('Search complete.');
  process.exit(0);
}
run();
