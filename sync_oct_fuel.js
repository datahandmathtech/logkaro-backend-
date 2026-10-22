const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
require('./src/models/Vehicle');
require('./src/models/Company');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Fuel = require('./src/models/Fuel');
  const CashTransaction = require('./src/models/CashTransaction');
  const Company = require('./src/models/Company');

  // October 2026 range
  const startOct = new Date('2026-10-01T00:00:00.000Z');
  const endOct = new Date('2026-10-31T23:59:59.999Z');

  const fuels = await Fuel.find({
    date: { $gte: startOct, $lte: endOct },
    paymentSource: { $in: ['Office', 'Company'] },
    paymentMode: { $regex: 'cash', $options: 'i' }
  }).populate('vehicle');

  console.log(`Found ${fuels.length} Office Cash fuel entries in October 2026:`);
  for (const f of fuels) {
    const existing = await CashTransaction.findOne({ sourceId: f._id });
    const vehNum = f.vehicle?.carNumber || 'Vehicle';
    console.log(`- Fuel ${f._id} | Date: ${f.date.toISOString().split('T')[0]} | Veh: ${vehNum} | Amt: ₹${f.amount} | Has CashTx: ${!!existing}`);
    
    if (!existing) {
      console.log(`  --> CREATING missing CashTransaction for Fuel ${f._id} (${vehNum}, ₹${f.amount})...`);
      const newTx = await CashTransaction.create({
        company: f.company,
        type: 'OUT',
        amount: f.amount,
        category: 'Vehicle Fuel',
        reference: f.billNumber || '',
        description: `Vehicle Fuel (${f.fuelType || 'Diesel'}, ${f.quantity ? f.quantity + 'L' : ''}) for ${vehNum}`,
        date: f.date,
        sourceId: f._id,
        sourceType: 'Fuel',
        createdBy: f.createdBy
      });
      console.log(`  --> Created CashTransaction ${newTx._id}`);
      await Company.findByIdAndUpdate(f.company, {
        $inc: { cashBalance: -f.amount }
      });
    }
  }

  process.exit(0);
}
run();
