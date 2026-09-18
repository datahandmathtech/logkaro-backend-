const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', 'utf8');

// The button has title="View Accounts Ledger" and style background: 'rgba(37, 99, 235, 0.2)'
const regex = /\{\/\* Pay Button \*\/\}\s*<button[\s\S]*?onClick=\{\(\) => handleOpenLedger\(bkg\)\}[\s\S]*?<\/button>/;

if (regex.test(code)) {
    code = code.replace(regex, '');
    console.log('Removed Pay/Accounts button');
} else {
    console.log('Could not find Pay/Accounts button to remove');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', code);
