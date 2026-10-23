require('dotenv').config();
const mongoose = require('mongoose');
const CashTransaction = require('../src/models/CashTransaction');
const BankTransaction = require('../src/models/BankTransaction');
const Advance = require('../src/models/Advance');
const User = require('../src/models/User');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    let fixed = 0;
    for (const Model of [CashTransaction, BankTransaction]) {
        const txs = await Model.find({ description: /^Advance given to (Driver|Staff) \(/ });
        for (const tx of txs) {
            let uid = tx.driverRef || null;
            if (!uid && tx.sourceId) {
                const adv = await Advance.findById(tx.sourceId).select('driver staff').lean();
                uid = adv?.driver || adv?.staff || null;
            }
            if (!uid) continue;
            const u = await User.findById(uid).select('name').lean();
            if (!u?.name) continue;
            tx.description = tx.description.replace(/^Advance given to (Driver|Staff) \(/, `Advance given to $1 ${u.name} (`);
            await tx.save();
            fixed++;
            console.log(Model.modelName, tx._id, '->', tx.description);
        }
    }
    console.log('Fixed', fixed);
    await mongoose.disconnect();
})();
