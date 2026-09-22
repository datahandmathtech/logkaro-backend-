const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove BASELINE_SEPTEMBER_BOOKINGS definition completely
const baselineArrayRegex = /\/\/ Baseline Mockup Data[\s\S]*?const BASELINE_SEPTEMBER_BOOKINGS = \[[\s\S]*?\];/;
code = code.replace(baselineArrayRegex, '');

// 2. Remove all fallbacks to BASELINE_SEPTEMBER_BOOKINGS
code = code.replace(/setBookings\(BASELINE_SEPTEMBER_BOOKINGS\);/g, 'setBookings([]);');
code = code.replace(/if \(list\.length === 0\) \{\s*list = BASELINE_SEPTEMBER_BOOKINGS;\s*\}/g, '');

fs.writeFileSync(filePath, code);
console.log("Patched yatree-frontend Bookings.jsx");
