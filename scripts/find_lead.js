const mongoose = require('mongoose');
require('dotenv').config();
const Lead = require('../src/models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const lead = await Lead.findOne({
    $or: [{ leadId: /09\/38/ }, { clientCode: /09\/38/ }, { clientName: /Vikas Jain/i }]
  });
  console.log('Lead 09/38:', {
    _id: lead?._id,
    leadId: lead?.leadId,
    clientCode: lead?.clientCode,
    clientName: lead?.clientName,
    status: lead?.status,
    priority: lead?.priority,
    travelStartDate: lead?.travelStartDate,
    travelEndDate: lead?.travelEndDate,
    bookingId: lead?.bookingId,
    notes: lead?.notes
  });
  process.exit(0);
}
run().catch(console.error);
