const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkAllCompanies() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

  const companies = await Company.find();
  for (const c of companies) {
    const adminCount = await User.countDocuments({ company: c._id, role: { $in: ['Admin', 'SuperAdmin'] } });
    const driverCount = await User.countDocuments({ company: c._id, role: 'Driver' });
    const vehicleCount = await Vehicle.countDocuments({ company: c._id });
    console.log(`Company: ${c.name} (ID: ${c._id}) -> Admins: ${adminCount}, Drivers: ${driverCount}, Vehicles: ${vehicleCount}`);
  }
  await mongoose.disconnect();
}
checkAllCompanies();
