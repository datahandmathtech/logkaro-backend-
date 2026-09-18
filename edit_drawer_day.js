const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

const bgRegex = /background: isExpanded \? 'rgba\(251, 191, 36, 0\.08\)' : \(hasLeads \? 'rgba\(255, 255, 255, 0\.015\)' : 'transparent'\),/;

const newBg = `background: isExpanded ? 'rgba(251, 191, 36, 0.08)' : (new Date().getDate() === item.dayNum && selectedSidebarMonth === new Date().toLocaleString('en-US', { month: 'long' }) + ' ' + new Date().getFullYear() ? 'rgba(34, 197, 94, 0.2)' : (hasLeads ? 'rgba(255, 255, 255, 0.015)' : 'transparent')),`;

if (bgRegex.test(code)) {
    code = code.replace(bgRegex, newBg);
    console.log('Background updated.');
} else {
    console.log('Regex failed');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
