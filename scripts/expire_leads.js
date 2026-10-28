const mongoose = require('mongoose');
require('dotenv').config();
const Lead = require('../src/models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const res = await Lead.updateMany(
    {
      status: { $nin: ['Confirmed', 'Lost'] },
      bookingId: null,
      $or: [
        { travelStartDate: { $lt: today } },
        { travelEndDate: { $lte: today } }
      ]
    },
    {
      $set: { status: 'Lost', priority: 'Lost' }
    }
  );

  console.log('Expired leads moved to Lost in DB:', res.modifiedCount);

  const lead38 = await Lead.findOne({ $or: [{ leadId: '09/38' }, { clientCode: '09/38' }] });
  console.log('Lead 09/38 now:', {
    clientCode: lead38?.clientCode,
    clientName: lead38?.clientName,
    status: lead38?.status,
    priority: lead38?.priority
  });

  process.exit(0);
}
run().catch(console.error);
