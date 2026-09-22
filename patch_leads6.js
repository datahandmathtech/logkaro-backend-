const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const targetRegex = /\{lead\.clientCode \|\| lead\.leadId \|\| 'N\/A'\}/g;
const replacement = `{'ID: ' + (lead.clientCode || lead.leadId || 'N/A')}`;

code = code.replace(targetRegex, replacement);

fs.writeFileSync(path, code);
console.log("Patched sidebar to prefix Client Code with ID:!");
