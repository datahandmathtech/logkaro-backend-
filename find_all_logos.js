const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function searchAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const all = await mongoose.connection.db.collection(col.name).find().toArray();
    for (const doc of all) {
      const str = JSON.stringify(doc);
      if (str.includes('logo-1789818581974') || str.includes('superadmin.yatreedestination.com')) {
        console.log(`Found in collection: ${col.name}, _id: ${doc._id}`);
        // Let's clean it!
        let cleaned = false;
        if (doc.logoUrl && doc.logoUrl.includes('superadmin.yatreedestination.com')) {
          doc.logoUrl = '';
          cleaned = true;
        }
        if (doc.logo && doc.logo.includes('superadmin.yatreedestination.com')) {
          doc.logo = '';
          cleaned = true;
        }
        if (doc.ownerSignatureUrl && doc.ownerSignatureUrl.includes('superadmin.yatreedestination.com')) {
          doc.ownerSignatureUrl = '';
          cleaned = true;
        }
        if (cleaned) {
          const { _id, ...rest } = doc;
          await mongoose.connection.db.collection(col.name).updateOne({ _id }, { $set: rest });
          console.log(`Cleaned document ${_id} in ${col.name}`);
        }
      }
    }
  }
  await mongoose.disconnect();
  console.log('Search & clean finished.');
}
searchAll();
