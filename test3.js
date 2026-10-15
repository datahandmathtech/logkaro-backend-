const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Mimic the backend getLeads filter for September
    const start = new Date(2026, 8, 1);
    const end = new Date(2026, 9, 0, 23, 59, 59);
    
    const leads = await Lead.find({
        status: { $nin: ['Lost', 'Cancelled'] },
        $or: [
            { leadDate: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } }
        ]
    });
    
    console.log('Total Leads for Sep:', leads.length);
    
    // Find conversions on Sep 23
    const conv23 = leads.filter(l => {
        if (!l.advanceDate && !l.advancePayment && l.status !== 'Confirmed' && !l.bookingId) return false;
        const d = new Date(l.advanceDate || l.updatedAt || l.createdAt);
        return d.getDate() === 23 && d.getMonth() === 8 && d.getFullYear() === 2026;
    });
    
    console.log('\nConverted on Sep 23 in this fetch:');
    let sum = 0;
    for(let l of conv23) {
        console.log(l.clientCode, l.totalAmount);
        sum += Number(l.totalAmount) || 0;
    }
    console.log('Sum:', sum);
    
    process.exit(0);
});
