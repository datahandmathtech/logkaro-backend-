const mongoose = require('mongoose');
const DRSDuty = require('e:/New folder/Master-Server/TEXI/yatree-backend/src/models/DRSDuty');
require('dotenv').config({ path: 'e:/New folder/Master-Server/TEXI/yatree-backend/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const duties = await DRSDuty.find().sort({_id: -1}).limit(5);
  console.log("Last 5 Duties:");
  duties.forEach(d => console.log(`ID: ${d._id}, Date: ${d.date}, Bkg: ${d.bookingId}, Client: ${d.clientName}, Status: ${d.status}`));
  process.exit();
}).catch(console.error);
