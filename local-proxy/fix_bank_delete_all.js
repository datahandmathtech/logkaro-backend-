const fs = require('fs');

function fixDeleteBankTransaction(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const oldLogic = `    await tx.deleteOne();
    res.json({ message: 'Transaction deleted successfully', currentBalance: bank ? bank.currentBalance : 0 });
});`;

    const newLogic = `    // If transaction is linked to a booking, reverse the advancePaid
    if (tx.bookingRef) {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(tx.bookingRef);
        if (booking) {
            if (tx.type === 'IN') {
                booking.advancePaid = Math.max(0, (booking.advancePaid || 0) - tx.amount);
            } else {
                booking.advancePaid = (booking.advancePaid || 0) + tx.amount;
            }
            booking.notes = (booking.notes || '') + \`\\n[System]: Payment of \${tx.amount} deleted from Bank Book.\`;
            await booking.save();
        }
    }

    await tx.deleteOne();
    res.json({ message: 'Transaction deleted successfully', currentBalance: bank ? bank.currentBalance : 0 });
});`;

    if (code.includes('await tx.deleteOne();') && !code.includes('tx.bookingRef')) {
        code = code.replace(oldLogic, newLogic);
        fs.writeFileSync(filePath, code);
        console.log('Fixed deleteBankTransaction in', filePath);
    }
}

fixDeleteBankTransaction('D:/Abhinandan/yatree-backend/src/controllers/bankController.js');
fixDeleteBankTransaction('E:/New folder/Master-Server/TEXI/Stundent-m/school-backend/src/controllers/bankController.js');
