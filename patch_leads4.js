const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const targetDivRegex = /<div\s*key=\{lead\._id \|\| lead\.leadId \|\| idx\}\s*style=\{\{\s*background: 'rgba\(255, 255, 255, 0\.03\)',\s*border: '1px solid rgba\(255, 255, 255, 0\.08\)',\s*borderRadius: '8px',\s*padding: '12px',\s*display: 'flex',\s*justifyContent: 'space-between',\s*alignItems: 'center',\s*marginBottom: '8px'\s*\}\}\s*>/g;

const replacement = `<div
                                                                        key={lead._id || lead.leadId || idx}
                                                                        onClick={() => setPreviewTourLead(lead)}
                                                                        title="Click to view full details"
                                                                        style={{
                                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                            borderRadius: '8px',
                                                                            padding: '12px',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            marginBottom: '8px',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >`;

code = code.replace(targetDivRegex, replacement);

fs.writeFileSync(path, code);
console.log("Patched clickable detail to sidebar card!");
