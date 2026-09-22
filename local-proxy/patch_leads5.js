const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const targetDivRegex = /<div style=\{\{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' \}\}>\s*\{lead\.clientCode \|\| lead\.leadId \|\| 'N\/A'\}\s*<\/div>/g;

const replacement = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>
                                                                                {lead.clientCode || lead.leadId || 'N/A'}
                                                                            </div>
                                                                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Details 👁️</span>
                                                                        </div>`;

code = code.replace(targetDivRegex, replacement);

fs.writeFileSync(path, code);
console.log("Added details icon to sidebar card!");
