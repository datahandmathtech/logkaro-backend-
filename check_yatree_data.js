const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkYatreeData() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
  const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));

  const compId = new mongoose.Types.ObjectId('698ac8b01587e01651a49443');
  const drivers = await User.find({ company: compId, role: 'Driver' }).select('name mobile status isFreelancer');
  console.log('--- YATREE DRIVERS (' + drivers.length + ') ---');
  console.log(drivers.map(d => ({ name: d.name, mob: d.mobile, status: d.status, isFreelancer: d.isFreelancer })));

  const duties = await DRSDuty.find({ company: compId }).sort({ createdAt: -1 }).limit(10);
  console.log('--- YATREE RECENT DRS DUTIES (' + duties.length + ') ---');
  console.log(duties.map(d => ({ name: d.clientName, code: d.bookingId, date: d.date, duty: d.duty })));

  await mongoose.disconnect();
}
checkYatreeData();
