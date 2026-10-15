const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

const parseLeadDateInfo = (rawDate) => {
    if (!rawDate) return null;
    if (typeof rawDate === 'string' && rawDate.length >= 10) {
        const parts = rawDate.slice(0, 10).split('-');
        if (parts.length === 3) {
            const yr = parseInt(parts[0], 10);
            const mo = parseInt(parts[1], 10) - 1;
            const dy = parseInt(parts[2], 10);
            if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
                return { year: yr, monthIdx: mo, day: dy };
            }
        }
    }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return {
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        day: d.getDate()
    };
};

mongoose.connect(uri).then(async () => {
    // 1. Backend gets leads
    const start = new Date(2026, 8, 1);
    const end = new Date(2026, 9, 0, 23, 59, 59);
    
    // Simulate API return array
    const backendLeads = await Lead.find({
        status: { $nin: ['Lost', 'Cancelled'] },
        $or: [
            { leadDate: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } }
        ]
    }).lean();
    
    // Convert Dates to string as JSON.stringify does
    const frontendLeads = JSON.parse(JSON.stringify(backendLeads));
    
    console.log('Total Leads for Sep received by frontend:', frontendLeads.length);
    
    // 2. Frontend filters for day 23
    const convLeads = frontendLeads.filter(l => {
        if (!l.advanceDate && !l.advancePayment && l.status !== 'Confirmed' && !l.bookingId) return false;
        const d = parseLeadDateInfo(l.advanceDate || l.updatedAt || l.createdAt);
        return d && d.year === 2026 && d.monthIdx === 8 && d.day === 23;
    });
    
    console.log('\nConverted on Sep 23 according to frontend:');
    let sum = 0;
    for(let l of convLeads) {
        console.log(l.clientCode, l.totalAmount);
        sum += Number(l.totalAmount) || 0;
    }
    console.log('Frontend Sum:', sum);
    
    process.exit(0);
});
