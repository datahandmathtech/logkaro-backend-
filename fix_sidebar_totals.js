const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(filePath, 'utf8');

const oldLogicRegex = /let totalLeads = 0;[\s\n]*let totalLeadsAmt = 0;[\s\n]*let totalConversions = 0;[\s\n]*let totalConversionsAmt = 0;[\s\n]*for \(let day = 1; day <= days; day\+\+\) \{/;

const newLogic = `
            let totalLeads = monthRealLeads.length;
            let totalLeadsAmt = monthRealLeads.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);
            
            const convs = monthRealLeads.filter(l => l.status === 'Confirmed' || l.status === 'Converted' || l.bookingId);
            let totalConversions = convs.length;
            let totalConversionsAmt = convs.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);

            for (let day = 1; day <= days; day++) {`;

code = code.replace(oldLogicRegex, newLogic);

const oldAccumulatorRegex = /totalLeads \+= leadsCount;[\s\n]*totalLeadsAmt \+= leadsAmt;[\s\n]*totalConversions \+= convCount;[\s\n]*totalConversionsAmt \+= convAmt;/;

const newAccumulator = `// Removed incorrect daily accumulation to avoid double counting`;

code = code.replace(oldAccumulatorRegex, newAccumulator);

fs.writeFileSync(filePath, code);
console.log("Fixed sidebarStats totals in yatree-frontend Leads.jsx");

