const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const specificCodes = ['09/50', '09/53', '09/56'];
    const specLeads = await Lead.find({ clientCode: { $in: specificCodes } });
    console.log('\nChecking specific codes:');
    let sum = 0;
    for(let l of specLeads) {
        console.log(l.clientCode, l.totalAmount, new Date(l.advanceDate || l.updatedAt).toLocaleDateString());
        sum += Number(l.totalAmount) || 0;
    }
    console.log('Sum:', sum);
    
    // Check what was converted on 23rd
    const all = await Lead.find({ status: 'Confirmed' });
    const sept23 = all.filter(l => {
        const d = new Date(l.advanceDate || l.updatedAt || l.createdAt);
        return d.getDate() === 23 && d.getMonth() === 8 && d.getFullYear() === 2026;
    });
    console.log('\nConfirmed on Sep 23:');
    for(let l of sept23) {
        console.log(l.clientCode, l.totalAmount);
    }
    process.exit(0);
});
