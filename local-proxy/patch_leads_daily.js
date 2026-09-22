const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove BASELINE mock logic
const mockupLogicStart = `        // Otherwise, for demonstration of September 2026, use baseline distribution matching UI mockup
        if (activeOption.tab === 'Sep') {`;
const genericEmptyStart = `        // Generic empty month
        const dailyList = [];`;

if (code.includes(mockupLogicStart)) {
    const startIndex = code.indexOf(mockupLogicStart);
    const endIndex = code.indexOf(genericEmptyStart);
    code = code.slice(0, startIndex) + code.slice(endIndex);
}

// 2. Also remove the BASELINE_SEPTEMBER_DISTRIBUTION array itself to clean up
const baselineArrayStart = `// Baseline mockup distribution matching reference screenshot
const BASELINE_SEPTEMBER_DISTRIBUTION = [`;
const afterBaselineArray = `];`;
if (code.includes(baselineArrayStart)) {
    const startIndex = code.indexOf(baselineArrayStart);
    const endIndex = code.indexOf(afterBaselineArray, startIndex) + afterBaselineArray.length;
    code = code.slice(0, startIndex) + code.slice(endIndex);
}

// 3. Add Client Code and Amount to expanded breakdown lead item
const leadHeaderStart = `{/* Entry Header: Name + Status */}`;
const oldHeaderCode = `<div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                                                                                    {lead.clientName || 'Guest'}
                                                                                </div>`;
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

if (code.includes(oldHeaderCode)) {
    code = code.replace(oldHeaderCode, newHeaderCode);
}

// Wait, the structural layout is:
/*
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                                            <div>
                                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                                                                                    {lead.clientName || 'Guest'}
                                                                                </div>
*/
// The new code will sit perfectly inside the `<div>`.

fs.writeFileSync(filePath, code);
console.log("Patched yatree-frontend Leads.jsx");

// Do the same for logkaro-frontend-
const logkaroPath = 'E:/New folder/Master-Server/TEXI/logkaro-frontend-/src/pages/Leads.jsx';
if (fs.existsSync(logkaroPath)) {
    let lCode = fs.readFileSync(logkaroPath, 'utf8');
    
    if (lCode.includes(mockupLogicStart)) {
        const startIndex = lCode.indexOf(mockupLogicStart);
        const endIndex = lCode.indexOf(genericEmptyStart);
        lCode = lCode.slice(0, startIndex) + lCode.slice(endIndex);
    }
    
    if (lCode.includes(baselineArrayStart)) {
        const startIndex = lCode.indexOf(baselineArrayStart);
        const endIndex = lCode.indexOf(afterBaselineArray, startIndex) + afterBaselineArray.length;
        lCode = lCode.slice(0, startIndex) + lCode.slice(endIndex);
    }
    
    if (lCode.includes(oldHeaderCode)) {
        lCode = lCode.replace(oldHeaderCode, newHeaderCode);
    }
    
    fs.writeFileSync(logkaroPath, lCode);
    console.log("Patched logkaro-frontend Leads.jsx");
}
