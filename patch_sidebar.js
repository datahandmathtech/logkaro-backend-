const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Filter out 'Lost' and 'Cancelled' in monthRealLeads
const filterRegex = /const monthRealLeads = \(sourceList \|\| \[\]\)\.filter\(l => \{/g;
const filterReplacement = `const monthRealLeads = (sourceList || []).filter(l => {
            if (l.status === 'Lost' || l.status === 'Cancelled') return false;`;
code = code.replace(filterRegex, filterReplacement);

// 2. Modify the card UI using string replacement between specific markers
const targetStart = '{/* Entry Header: Name + Status */}';
const targetEnd = '{/* END ENTRY DIV */}'; 
// wait, I don't know where the div ends exactly. Let's find a reliable end point.
