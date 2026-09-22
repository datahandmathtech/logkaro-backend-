const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Bookings.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const targetCodePrefix = monthCodeMap\[selectedMonth\];[\s\S]*?list = list\.filter\(b => \{[\s\S]*?return false;\s*\}\);/;

const replacement = `            list = list.filter(b => {
                let d = null;
                
                // Handle DD/MM/YYYY or YYYY-MM-DD formats for travelStartDate
                if (b.travelStartDate) {
                    const parts = b.travelStartDate.split(/[-/]/);
                    if (parts.length === 3) {
                        // Assume DD/MM/YYYY
                        if (parts[0].length === 2 && parts[2].length === 4) {
                            d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                        } 
                        // Assume YYYY-MM-DD
                        else if (parts[0].length === 4) {
                            d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                        } else {
                            d = new Date(b.travelStartDate);
                        }
                    } else {
                        d = new Date(b.travelStartDate);
                    }
                } else if (b.createdAt) {
                    d = new Date(b.createdAt);
                }
                
                if (d && !isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return false;
            });`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
    console.log("Regex matched and patched Bookings.jsx!");
} else {
    console.log("Regex did not match.");
}
