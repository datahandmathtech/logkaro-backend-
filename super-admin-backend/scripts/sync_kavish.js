const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Tenant = require('../src/models/Tenant');

const syncMaster = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to Super Admin DB');

        const tenant = await Tenant.findOne({ companyName: /YatreeDestination/i });
        if (tenant) {
            tenant.ownerName = 'System Admin';
            tenant.adminEmail = 'kavishuser1';
            tenant.email = 'kavishuser1@super.com';
            await tenant.save();
            console.log('Successfully synced YatreeDestination to Master User (Kavish)');
        } else {
            console.log('Tenant YatreeDestination not found');
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

syncMaster();
