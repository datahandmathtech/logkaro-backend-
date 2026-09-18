const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/invoiceController.js', 'utf8');

code = code.replace(
    /await BankTransaction\.deleteMany\(\{ referenceId: invoice\.booking \}\);/g,
    'await BankTransaction.deleteMany({ bookingRef: invoice.booking });'
);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/invoiceController.js', code);
console.log('Fixed BankTransaction.deleteMany in deleteInvoice');
