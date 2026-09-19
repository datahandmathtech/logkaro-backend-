const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/leadController.js', 'utf8');

const regex = /advancePaid: advance, advanceDate: advancePaymentDate \|\| new Date\(\),/;
const replacement = `advancePaid: advance, advanceDate: advancePaymentDate || new Date(),
        paymentMode: paymentMode || 'UPI / QR Code',
        paymentReference: paymentReference || '',`;
code = code.replace(regex, replacement);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/leadController.js', code);
console.log('Added paymentMode to Booking create');
