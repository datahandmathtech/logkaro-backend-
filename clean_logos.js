const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkAndClean() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
  const BankTransaction = mongoose.model('BankTransaction', new mongoose.Schema({}, { strict: false }));
  const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));

  // Check companies with broken remote logo urls
  const companies = await Company.find();
  for (const c of companies) {
    if (c.logoUrl && c.logoUrl.includes('superadmin.yatreedestination.com')) {
      console.log(`Fixing broken logoUrl for company ${c.name}: ${c.logoUrl}`);
      c.logoUrl = '';
      await c.save();
    }
  }

  const txs = await BankTransaction.find({ paymentScreenshot: { $exists: true } });
  console.log('Bank transactions with screenshot field:', txs.length);

  await mongoose.disconnect();
}
checkAndClean();
