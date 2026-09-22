const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Pagination itemsPerPage
code = code.replace(/const itemsPerPage = 8;/g, 'const itemsPerPage = 500;');

// 2. Filter out Lost/Cancelled leads in Daily Breakdown
const filterRegex = /const monthRealLeads = \(sourceList \|\| \[\]\)\.filter\(l => \{/g;
const filterReplacement = `const monthRealLeads = (sourceList || []).filter(l => {
            if (l.status === 'Lost' || l.status === 'Cancelled') return false;`;
code = code.replace(filterRegex, filterReplacement);

// 3. Simplify Daily Breakdown Card
const startIndex = code.indexOf('{item.leads.map((lead, idx) => (');
const endMarker = '))}';

if (startIndex !== -1) {
    const endIndex = code.indexOf(endMarker, startIndex + 5000); // skip the map body
    
    if (endIndex !== -1) {
        const replacement = `{item.leads.map((lead, idx) => (
                                                                    <div
                                                                        key={lead._id || lead.leadId || idx}
                                                                        style={{
                                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                            borderRadius: '8px',
                                                                            padding: '12px',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            marginBottom: '8px'
                                                                        }}
                                                                    >
                                                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>
                                                                            {lead.clientCode || lead.leadId || 'N/A'}
                                                                        </div>
                                                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#4ade80' }}>
                                                                            ₹{(Number(lead.totalAmount) || 0).toLocaleString('en-IN')}
                                                                        </div>
                                                                    </div>
                                                                `;
        const finalCode = code.substring(0, startIndex) + replacement + code.substring(endIndex);
        fs.writeFileSync(path, finalCode);
        console.log("Patched everything successfully!");
    } else {
        console.log("Could not find endIndex!");
    }
} else {
    console.log("Could not find startIndex!");
}
