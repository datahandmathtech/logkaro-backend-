const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tenant = require('./models/Tenant');
const Vehicle = require('./models/Vehicle');
const Company = require('./models/Company');

dotenv.config();

const debugMapping = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const tenants = await Tenant.find({}).lean();
        console.log(`Found ${tenants.length} tenants`);

        for (const t of tenants) {
            console.log(`\nTenant: ${t.companyName}`);
            console.log(`Company ID in Tenant: ${t.companyId}`);
            
            if (t.companyId) {
                const company = await Company.findById(t.companyId);
                console.log(`Company Name in DB: ${company ? company.name : 'NOT FOUND'}`);

                const vCount = await Vehicle.countDocuments({ company: t.companyId });
                const vCountInternal = await Vehicle.countDocuments({ company: t.companyId, isOutsideCar: false });
                console.log(`Vehicle Count (Total): ${vCount}`);
                console.log(`Vehicle Count (Internal): ${vCountInternal}`);

                if (vCount === 0) {
                    console.log('Searching for any vehicle to see their company field...');
                    const sampleVehicle = await Vehicle.findOne({});
                    if (sampleVehicle) {
                        console.log(`Sample Vehicle carNumber: ${sampleVehicle.carNumber}`);
                        console.log(`Sample Vehicle company ID: ${sampleVehicle.company}`);
                    } else {
                        console.log('No vehicles found at all in the collection!');
                    }
                }
            } else {
                console.log('This tenant has no companyId!');
            }
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugMapping();
