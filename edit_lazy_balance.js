const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bookingController.js', 'utf8');

const replacement = `
            // Check 1: Balance is 0
            const actualBalance = (b.packagePrice || 0) - (b.advancePaid || 0);
            if (actualBalance <= 0 && b.advancePaid > 0) {
                shouldComplete = true;
            }
`;

code = code.replace(
    /\/\/ Check 1: Balance is 0\s*if \(b\.balanceDue <= 0 && b\.advancePaid > 0\) \{\s*shouldComplete = true;\s*\}/,
    replacement
);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bookingController.js', code);
console.log('Fixed lazy eval balance calculation');
