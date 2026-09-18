const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', 'utf8');

// Find the Tax Invoice button in the dropdown
const regex = /<button[\s\S]*?onClick=\{\(\) => \{\s*setActiveActionMenu\(null\);\s*handleOpenInvoiceModal\(bkg\);\s*\}\}[\s\S]*?Tax Invoice\s*<\/button>/;

if (regex.test(code)) {
    code = code.replace(regex, '');
    console.log('Removed Tax Invoice button from Bookings dropdown.');
} else {
    console.log('Could not find Tax Invoice button to remove.');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', code);
