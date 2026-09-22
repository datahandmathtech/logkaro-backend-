const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Filter out Confirmed leads and bookingId
const filterRegex = /if \(l\.status === 'Lost' \|\| l\.status === 'Cancelled'\) return false;/;
const filterReplacement = `if (l.status === 'Lost' || l.status === 'Cancelled' || l.status === 'Confirmed' || l.bookingId) return false;`;
code = code.replace(filterRegex, filterReplacement);

// 2. Remove Total Conversions from Right Sidebar header
const headerConvRegex = /<div style=\{\{\s*textAlign: 'right'\s*\}\}>\s*<div style=\{\{\s*fontSize: '10px',\s*color: '#86efac',\s*fontWeight: '700'\s*\}\}>Total Conversions<\/div>\s*<div style=\{\{\s*fontSize: '15px',\s*fontWeight: '900',\s*color: '#4ade80'\s*\}\}>\{sidebarStats\.convertedCount \|\| sidebarStats\.totalConversions\}<\/div>\s*<\/div>/g;
code = code.replace(headerConvRegex, '');

// 3. Change gridTemplateColumns from '60px 1fr 1fr' to '60px 1fr'
const gridRegex = /gridTemplateColumns:\s*'60px 1fr 1fr'/g;
code = code.replace(gridRegex, "gridTemplateColumns: '60px 1fr'");

// 4. Remove Conversion block from grid
const conversionBlockRegex = /\{\/\* Conversion \*\/\}\s*<div style=\{\{\s*textAlign: 'right'\s*\}\}>\s*<div style=\{\{\s*fontWeight: '800',\s*fontSize: '13px',\s*color: item\.convCount > 0 \? '#4ade80' : 'rgba\(255,255,255,0\.3\)'\s*\}\}>\s*\{item\.convCount\}\s*<\/div>\s*<div style=\{\{\s*fontSize: '11px',\s*fontWeight: '600',\s*color: item\.convCount > 0 \? '#86efac' : 'rgba\(255,255,255,0\.25\)',\s*marginTop: '1px'\s*\}\}>\s*₹\{item\.convAmt\.toLocaleString\('en-IN'\)\}\s*<\/div>\s*<\/div>/g;
code = code.replace(conversionBlockRegex, '');

fs.writeFileSync(path, code);
console.log("Patched Daily Breakdown successfully!");
