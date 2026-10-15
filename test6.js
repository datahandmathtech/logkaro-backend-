const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const Company = require('./src/models/Company');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const companies = await Company.find();
    for (let c of companies) {
        const start = new Date(2026, 8, 1);
        const end = new Date(2026, 9, 0, 23, 59, 59);
        const backendLeads = await Lead.find({
            company: c._id,
            status: { $nin: ['Lost', 'Cancelled'] },
            $or: [
                { leadDate: { $gte: start, $lte: end } },
                { createdAt: { $gte: start, $lte: end } }
            ]
        }).lean();
        
        console.log(`Company ${c.name} has ${backendLeads.length} leads in Sep`);
        
        const convLeads = backendLeads.filter(l => {
            if (!l.advanceDate && !l.advancePayment && l.status !== 'Confirmed' && !l.bookingId) return false;
            let d;
            if (l.advanceDate) d = new Date(l.advanceDate);
            else if (l.updatedAt) d = new Date(l.updatedAt);
            else d = new Date(l.createdAt);
            
            return d.getDate() === 23 && d.getMonth() === 8 && d.getFullYear() === 2026;
        });
        
        let sum = 0;
        for(let l of convLeads) {
            console.log(' - Conv on 23rd:', l.clientCode, l.totalAmount);
            sum += Number(l.totalAmount) || 0;
        }
        console.log(` - Sum: ${sum}`);
    }
    process.exit(0);
});
