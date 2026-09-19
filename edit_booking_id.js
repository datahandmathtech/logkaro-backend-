const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/leadController.js', 'utf8');

const regex = /\/\/ 1\. Generate unique sequential Booking ID \(e\.g\. LK-BKG-2026-00001\)\s*const bookingId = await getNextSequence\('LK-BKG'\);/;
const replacement = `// 1. Generate unique sequential Booking ID (e.g. LK-BKG-2026-00001)
    let bookingId = lead.clientCode;
    if (!bookingId) {
        bookingId = await getNextSequence('LK-BKG');
    }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/leadController.js', code);
    console.log('Fixed leadController bookingId generation');
} else {
    console.log('Regex failed in leadController');
}
