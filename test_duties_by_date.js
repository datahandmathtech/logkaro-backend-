const mongoose = require('mongoose');
require('dotenv').config();

async function checkDutiesByDate() {
    await mongoose.connect(process.env.MONGODB_URI);
    const DRSDuty = mongoose.model('DRSDuty', new mongoose.Schema({}, { strict: false }));

    const duties = await DRSDuty.find({}).sort({ date: 1 });
    const byDate = {};
    duties.forEach(d => {
        const dateStr = d.date?.toISOString().split('T')[0] || 'NO_DATE';
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push({
            id: d._id,
            bookingId: d.bookingId,
            clientName: d.clientName,
            dayNo: d.dayNo,
            duty: d.duty,
            carNumber: d.customCarNumber,
            driver: d.customDriverName
        });
    });

    console.log('=== Duties Grouped By Date ===');
    Object.keys(byDate).sort().forEach(date => {
        console.log(`\nDate: ${date} (Total: ${byDate[date].length})`);
        byDate[date].forEach(item => {
            console.log(`  - [${item.bookingId}] ${item.clientName} (Day ${item.dayNo}): ${item.duty} | Car: ${item.carNumber}`);
        });
    });

    await mongoose.disconnect();
}
checkDutiesByDate();
