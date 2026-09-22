const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const filterRegex = /const monthRealLeads = \(sourceList \|\| \[\]\)\.filter\(l => \{/g;
const filterReplacement = `const monthRealLeads = (sourceList || []).filter(l => {
            if (l.status === 'Lost' || l.status === 'Cancelled') return false;`;
            
if (code.match(filterRegex)) {
    code = code.replace(filterRegex, filterReplacement);
    fs.writeFileSync(path, code);
    console.log("Applied Lost/Cancelled filter to Daily Breakdown!");
} else {
    console.log("Could not find regex match for monthRealLeads filter.");
}
