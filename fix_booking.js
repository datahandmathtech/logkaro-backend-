const fs = require('fs');
let code = fs.readFileSync('src/controllers/bookingController.js', 'utf8');

const regex = /const actualBalance = \(b\.packagePrice \|\| 0\) - \(b\.advancePaid \|\| 0\);/;
const replacement = `const actualBalance = (b.packagePrice || b.totalAmount || 0) - (b.advancePaid || 0);`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/controllers/bookingController.js', code);
    console.log('Fixed actualBalance');
} else {
    console.log('Regex failed');
}
