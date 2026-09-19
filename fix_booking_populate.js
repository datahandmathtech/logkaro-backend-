const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bookingController.js', 'utf8');

code = code.replace(
    /\.populate\('lead', 'leadId status totalAmount'\)/,
    ".populate('lead', 'leadId status totalAmount remarksHistory specialRemarks')"
);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bookingController.js', code);
console.log('Populated remarks in Bookings');
