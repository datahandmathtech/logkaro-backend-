const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

const footerRegex = /\{\/\* Drawer Footer \*\/\}\s*<div style=\{\{[\s\S]*?justifyContent: 'space-between'[\s\S]*?\}\}>\s*<span style=\{\{[\s\S]*?\}\}>\s*\{selectedSidebarMonth\}\s*<\/span>\s*<button[\s\S]*?>\s*Close\s*<\/button>\s*<\/div>/;

if (footerRegex.test(code)) {
    code = code.replace(footerRegex, '');
    console.log('Drawer Footer removed.');
}

const dayHighlightRegex = /background: expandedBreakdownDay === day\.dayNum \? 'rgba\(255, 255, 255, 0\.06\)' : 'transparent',/g;
if (dayHighlightRegex.test(code)) {
    // We want today to be green if we are looking at the current month!
    const replacement = `background: expandedBreakdownDay === day.dayNum ? 'rgba(255, 255, 255, 0.06)' : (new Date().getDate() === day.dayNum && selectedSidebarMonth.includes(new Date().toLocaleString('en-US', { month: 'short' })) ? 'rgba(34, 197, 94, 0.15)' : 'transparent'),`;
    code = code.replace(dayHighlightRegex, replacement);
    console.log('Day Highlight added.');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
