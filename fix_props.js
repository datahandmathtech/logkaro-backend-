const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

// 1. Update InlineRemarkEditor signature
code = code.replace(
    /const InlineRemarkEditor = \(\{ lead, fetchLeads, setViewingImage \}\) => \{/,
    'const InlineRemarkEditor = ({ lead, fetchLeads, setViewingImage, customRemarks, setCustomRemarks, selectedCompany }) => {'
);

// 2. Update the usage in the table
code = code.replace(
    /<InlineRemarkEditor lead=\{lead\} fetchLeads=\{fetchLeads\} setViewingImage=\{setViewingImage\} \/>/g,
    '<InlineRemarkEditor lead={lead} fetchLeads={fetchLeads} setViewingImage={setViewingImage} customRemarks={customRemarks} setCustomRemarks={setCustomRemarks} selectedCompany={selectedCompany} />'
);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
console.log('Fixed InlineRemarkEditor props');
