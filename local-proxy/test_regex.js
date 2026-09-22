const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /return \{\s*totalLeads: [^,]*,[\s\n]*totalLeadsAmt: [^,]*,[\s\n]*totalConversions: [^,]*,[\s\n]*totalConversionsAmt: [^,]*,[\s\n]*dailyList\s*\};\s*\}, \[/g;

const matches = code.match(regex);
console.log("Matches found:", matches ? matches.length : 0);
