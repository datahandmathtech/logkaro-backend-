const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
require('./src/models/Vehicle');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Fuel = require('./src/models/Fuel');
  const CashTransaction = require('./src/models/CashTransaction');

  const f = await Fuel.findById('6abfdb3a9daa2bdbc5355b77').populate('vehicle');
  console.log('Fuel doc 6abfdb3a9daa2bdbc5355b77:');
  console.log('Vehicle:', f.vehicle?.carNumber, 'Amount:', f.amount, 'Date:', f.date?.toISOString()?.split('T')[0], 'Mode:', f.paymentMode, 'Source:', f.paymentSource);

  const existingCashTx = await CashTransaction.findOne({ sourceId: f._id });
  console.log('Existing CashTx for 6abfdb3a9daa2bdbc5355b77:', existingCashTx);

  // Check all Office Cash Fuel entries
  const officeCashFuels = await Fuel.find({
    paymentSource: { $in: ['Office', 'Company'] },
    paymentMode: { $regex: 'cash', $options: 'i' }
  }).populate('vehicle');

  console.log('\nAll Office Cash Fuel entries count:', officeCashFuels.length);
  let missingCount = 0;
  for (const ocf of officeCashFuels) {
    const hasTx = await CashTransaction.findOne({ sourceId: ocf._id });
    if (!hasTx) {
      missingCount++;
      console.log(`MISSING: Fuel ${ocf._id} | Date: ${ocf.date ? ocf.date.toISOString().split('T')[0] : ''} | Veh: ${ocf.vehicle?.carNumber || 'N/A'} | Amt: ₹${ocf.amount}`);
    }
  }
  console.log('Total missing CashTx for Office Cash fuel:', missingCount);

  process.exit(0);
}
run();
