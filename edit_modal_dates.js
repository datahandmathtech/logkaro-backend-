const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

const regex = /itinerary: \(lead\.itinerary \|\| \[\]\)\.map\(\(d, i\) => \{\s*const rowDate = sDate \? addDaysToDateString\(sDate, i\) : toLocalDateString\(d\.date\);\s*return \{\s*dayNo: d\.dayNo \|\| i \+ 1,\s*date: rowDate \|\| toLocalDateString\(d\.date\),/;

const replacement = `itinerary: (lead.itinerary || []).map((d, i) => {
                    return {
                        dayNo: d.dayNo || i + 1,
                        date: toLocalDateString(d.date),`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    console.log('Fixed handleOpenModal itinerary mapping.');
} else {
    console.log('Regex failed.');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
