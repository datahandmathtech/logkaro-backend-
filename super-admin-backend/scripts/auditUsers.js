const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const companies = await mongoose.connection.db.collection('companies').find({}).toArray();
        for (const c of companies) {
           const users = await mongoose.connection.db.collection('users').find({ company: c._id }).toArray();
           console.log(`Company: ${c.name} | Users: ${users.length} | Admins: ${users.filter(u => u.role === 'Admin').length}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
