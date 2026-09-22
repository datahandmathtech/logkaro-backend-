const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update monthRealLeads filter to exclude Confirmed leads
const filterRegex = /const monthRealLeads = \(sourceList \|\| \[\]\)\.filter\(l => \{[\s\S]*?if \(l\.status === 'Lost' \|\| l\.status === 'Cancelled'\) return false;/;
const filterReplacement = `const monthRealLeads = (sourceList || []).filter(l => {
            if (l.status === 'Lost' || l.status === 'Cancelled' || l.status === 'Confirmed' || l.bookingId) return false;`;
code = code.replace(filterRegex, filterReplacement);

// 2. Remove "Total Conversions" from Right Sidebar header
// We'll replace the grid `gridTemplateColumns: '1fr 1fr'` if there is one, or just the div.
const headerRegex = /<div style=\{\{ textAlign: 'right' \}\}>\s*<div style=\{\{ fontSize: '10px', color: '#86efac', fontWeight: '700' \}\}>Total Conversions<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
// Wait, that might be tricky. Let's find exactly what to replace.
