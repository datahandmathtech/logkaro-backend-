const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

const toggleRegex = /\{\/\* Amount Toggle \*\/\}\s*<div style=\{\{\s*display: 'flex',\s*alignItems: 'center',\s*background: 'rgba\(255, 255, 255, 0\.06\)',\s*borderRadius: '8px',\s*padding: '3px',\s*border: '1px solid rgba\(255, 255, 255, 0\.12\)'\s*\}\}>\s*<button[\s\S]*?<\/button>\s*<button[\s\S]*?<\/button>\s*<\/div>/;

if (toggleRegex.test(code)) {
    code = code.replace(toggleRegex, '');
    console.log('Amount Toggle removed from header.');
} else {
    console.log('Regex failed.');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
