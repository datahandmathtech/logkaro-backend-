const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function inspectData() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
  const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));

  const drivers = await User.find({ role: 'Driver' }).select('name mobile status company isFreelancer');
  console.log('--- ALL DRIVERS IN DB (' + drivers.length + ') ---');
  console.log(drivers.map(d => ({ id: d._id, name: d.name, mob: d.mobile, status: d.status, isFree: d.isFreelancer })));

  const vehicles = await Vehicle.find().select('carNumber model status company isOutsideCar');
  console.log('--- ALL VEHICLES IN DB (' + vehicles.length + ') ---');
  console.log(vehicles.map(v => ({ id: v._id, number: v.carNumber, model: v.model, status: v.status, isOutside: v.isOutsideCar })));

  const duties = await DRSDuty.find().select('clientName bookingId date duty driver vehicle status');
  console.log('--- ALL DRS DUTIES IN DB (' + duties.length + ') ---');
  console.log(duties.map(d => ({ id: d._id, name: d.clientName, code: d.bookingId, date: d.date, duty: d.duty, status: d.status })));

  const attToday = await Attendance.find().sort({ createdAt: -1 }).limit(10);
  console.log('--- RECENT ATTENDANCE (' + attToday.length + ') ---');
  console.log(attToday.map(a => ({ id: a._id, date: a.date, status: a.status, inTime: a.punchInTime })));

  await mongoose.disconnect();
}
inspectData();
