const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function inspectCompanyData() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

  const admin = await User.findOne({ role: 'Admin' });
  console.log('Logged in Admin company:', admin.company);

  const drivers = await User.find({ company: admin.company, role: 'Driver' });
  console.log('Drivers count for this company:', drivers.length);
  drivers.forEach(d => console.log(`Driver: ${d.name}, mob: ${d.mobile}, status: ${d.status}, isFreelancer: ${d.isFreelancer}`));

  const vehicles = await Vehicle.find({ company: admin.company });
  console.log('Vehicles count for this company:', vehicles.length);
  vehicles.forEach(v => console.log(`Vehicle: ${v.carNumber}, model: ${v.model}, status: ${v.status}`));

  const att = await Attendance.find({ company: admin.company, date: '2026-09-29' }).populate('driver').populate('vehicle');
  console.log('Attendance today count:', att.length);
  att.forEach(a => console.log(`Att: driver=${a.driver?.name}, car=${a.vehicle?.carNumber}, status=${a.status}, inTime=${a.punchInTime}`));

  await mongoose.disconnect();
}
inspectCompanyData();
