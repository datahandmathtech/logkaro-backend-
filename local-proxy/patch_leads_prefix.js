const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const targetRegex = /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*<div style=\{\{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' \}\}>\s*\{lead\.clientCode \|\| lead\.leadId \|\| 'N\/A'\}\s*<\/div>/g;

const replacement = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>
                                                                                Code: {lead.clientCode || lead.leadId || 'N/A'}
                                                                            </div>`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync(path, code);
console.log("Added Code: prefix to sidebar cards!");
