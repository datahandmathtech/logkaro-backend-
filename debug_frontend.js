const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', 'utf8');

const regex = /const processedBookings = useMemo\(\(\) => \{/;
const replacement = `const processedBookings = useMemo(() => {
          console.log('Bookings state:', bookings.length, bookings.map(b => b.bookingStatus));`;

if (code.includes('console.log(\'Bookings state:\'')) {
    console.log('Already added');
} else {
    code = code.replace(regex, replacement);
    fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx', code);
    console.log('Added console.log');
}
