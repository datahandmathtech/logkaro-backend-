const fs = require('fs');
let code = fs.readFileSync('src/controllers/bookingController.js', 'utf8');

const regex = /const actualBalance = \(b\.packagePrice \|\| b\.totalAmount \|\| 0\) - \(b\.advancePaid \|\| 0\);\s*if \(actualBalance <= 0 && b\.advancePaid > 0\) \{\s*shouldComplete = true;\s*\}/;
const replacement = `const actualBalance = (b.packagePrice || b.totalAmount || 0) - (b.advancePaid || 0);
              console.log('--- AUTO-COMPLETE DEBUG ---');
              console.log('Booking:', b._id, 'Status:', b.bookingStatus);
              console.log('pkg:', b.packagePrice, 'tot:', b.totalAmount, 'adv:', b.advancePaid);
              console.log('actualBalance:', actualBalance);
              if (actualBalance <= 0 && b.advancePaid > 0) {
                  console.log('=> completing due to balance');
                  shouldComplete = true;
              }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/controllers/bookingController.js', code);
    console.log('Added debug logs');
} else {
    console.log('Regex failed');
}
