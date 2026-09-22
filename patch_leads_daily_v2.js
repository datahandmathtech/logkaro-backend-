const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove BASELINE mock logic
const mockupRegex = /\/\/ Otherwise, for demonstration of September 2026[\s\S]*?if \(activeOption\.tab === 'Sep'\) \{[\s\S]*?return \{[\s\S]*?dailyList: BASELINE_SEPTEMBER_DISTRIBUTION[\s\S]*?\};[\s\n]*\}/;
code = code.replace(mockupRegex, '');

// 2. Remove the BASELINE_SEPTEMBER_DISTRIBUTION array itself
const baselineArrayRegex = /\/\/ Baseline mockup distribution matching reference screenshot[\s\S]*?const BASELINE_SEPTEMBER_DISTRIBUTION = \[[\s\S]*?\];/;
code = code.replace(baselineArrayRegex, '');

// 3. Add Client Code and Amount to expanded breakdown lead item
const oldHeaderCode = /<div style=\{\{ fontSize: '13px', fontWeight: '800', color: 'white' \}\}>\s*\{lead\.clientName \|\| 'Guest'\}\s*<\/div>/;
const newHeaderCode = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                                                                                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>
                                                                                        {lead.clientCode || lead.leadId || 'N/A'}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#4ade80' }}>
                                                                                        ₹{(Number(lead.totalAmount) || 0).toLocaleString('en-IN')}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                                                                                    {lead.clientName || 'Guest'}
                                                                                </div>`;

if (code.match(oldHeaderCode)) {
    code = code.replace(oldHeaderCode, newHeaderCode);
    console.log("Replaced header!");
} else {
    console.log("Could not find header to replace!");
}

fs.writeFileSync(filePath, code);
console.log("Patched yatree-frontend Leads.jsx properly");
