const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', 'utf8');

const regex = /\/\/ 3\. Sorting\s*return \[\.\.\.list\]\.sort/g;
const replacement = `// 3. Sorting
          console.log('Final list length before sort:', list.length, 'selectedMonth:', selectedMonth);
          return [...list].sort`;

if (!code.includes('Final list length before sort')) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', code);
    console.log('Added final log');
} else {
    console.log('Already added');
}
