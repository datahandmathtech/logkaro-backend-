const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- SYSTEM AUDIT ---');

        const companyCount = await mongoose.connection.db.collection('companies').countDocuments({});
        console.log(`Total Companies in CRM: ${companyCount}`);

        const tenantCount = await mongoose.connection.db.collection('tenants').countDocuments({});
        console.log(`Total Tenants in SuperAdmin: ${tenantCount}`);

        const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
        tenants.forEach(t => {
            console.log(`Tenant: ${t.companyName} | companyId: ${t.companyId} | email: ${t.email}`);
        });

        const companies = await mongoose.connection.db.collection('companies').find({}).toArray();
        companies.forEach(c => {
             console.log(`Company: ${c.name} | _id: ${c._id}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
