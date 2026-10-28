const mongoose = require('mongoose');
require('dotenv').config();
const Advance = require('../src/models/Advance');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const drivers = await User.find({ role: 'driver' });
  const rahul = drivers.find(d => d.name.toLowerCase().includes('rahul'));
  const piyush = drivers.find(d => d.name.toLowerCase().includes('piyush'));
  console.log('Rahul ID:', rahul?._id, 'Piyush ID:', piyush?._id);

  if (rahul) {
    const advsR = await Advance.find({ driver: rahul._id });
    console.log('Rahul Advances:', advsR);
  }
  if (piyush) {
    const advsP = await Advance.find({ driver: piyush._id });
    console.log('Piyush Advances:', advsP);
  }

  process.exit(0);
}
run().catch(console.error);
