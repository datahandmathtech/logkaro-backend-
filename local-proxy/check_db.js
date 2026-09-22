const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://abhinandan9822_db_user:bmRK2asB2WA9guOw@ac-crupkmd-shard-00-00.iienpcd.mongodb.net:27017,ac-crupkmd-shard-00-01.iienpcd.mongodb.net:27017,ac-crupkmd-shard-00-02.iienpcd.mongodb.net:27017/taxi-fleet?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function check() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const companies = await db.collection('companies').find({}).toArray();
    console.log('Companies:', companies.length);
    const users = await db.collection('users').find({}).toArray();
    console.log('Users:', users.length);
    mongoose.disconnect();
}
check();
