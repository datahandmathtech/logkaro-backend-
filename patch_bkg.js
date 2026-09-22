const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /list = list\.filter\(b => \{[\s\S]*?return false;\s*\}\);/;

const replacement = `list = list.filter(b => {
                const d = new Date(b.travelStartDate || b.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return false;
            });`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log("Patched Bookings.jsx logic!");
