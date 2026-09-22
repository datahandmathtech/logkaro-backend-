const mongoose = require('mongoose');
console.log('--- SEED SCRIPT STARTING ---');
const dotenv = require('dotenv');
const SuperAdmin = require('./src/models/SuperAdmin');

dotenv.config();

const seedSuperAdmin = async () => {
    try {
        console.log('Connecting to:', process.env.MONGO_URI ? 'URI FOUND' : 'URI MISSING');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB!');
        // Clear existing superadmins (Optional)
        // await SuperAdmin.deleteMany();

        const adminExists = await SuperAdmin.findOne({ email: 'superadmin@texi.com' });

        if (adminExists) {
            console.log('Super Admin already exists.');
            process.exit();
        }

        const admin = new SuperAdmin({
            name: 'Main Super Admin',
            email: 'superadmin@texi.com',
            password: 'superpassword123', // Will be hashed by pre-save middleware
        });

        await admin.save();
        console.log('Super Admin created successfully!');
        console.log('Email: superadmin@texi.com');
        console.log('Password: superpassword123');
        process.exit();
    } catch (error) {
        console.error('--- SEED ERROR ---');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedSuperAdmin();
