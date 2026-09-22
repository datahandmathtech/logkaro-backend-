const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Confirmed leads are moved to Confirmed Bookings page, so do not display them in Sales Leads table!\s*if \(lead\.status === 'Confirmed' \|\| lead\.bookingId\) \{\s*return false;\s*\}/;

if (code.match(regex)) {
    code = code.replace(regex, `// User requested to show Confirmed leads in the Leads table too!
            // if (lead.status === 'Confirmed' || lead.bookingId) {
            //     return false;
            // }`);
    fs.writeFileSync(path, code);
    console.log("Patched Leads.jsx to show confirmed leads!");
} else {
    console.log("Could not find the target code in Leads.jsx");
}
