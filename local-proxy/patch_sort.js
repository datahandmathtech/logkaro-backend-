const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex1 = /return \{\s*totalLeads,\s*totalLeadsAmt,\s*totalConversions,\s*totalConversionsAmt,\s*dailyList\s*\};/;
const replacement1 = `const today = new Date().getDate();
            dailyList.sort((a, b) => {
                if (a.day === today) return -1;
                if (b.day === today) return 1;
                return a.day - b.day;
            });
            return {
                totalLeads,
                totalLeadsAmt,
                totalConversions,
                totalConversionsAmt,
                dailyList
            };`;

const regex2 = /return \{\s*totalLeads: 0,\s*totalLeadsAmt: 0,\s*totalConversions: 0,\s*totalConversionsAmt: 0,\s*dailyList\s*\};/;
const replacement2 = `const today = new Date().getDate();
        dailyList.sort((a, b) => {
            if (a.day === today) return -1;
            if (b.day === today) return 1;
            return a.day - b.day;
        });
        return {
            totalLeads: 0,
            totalLeadsAmt: 0,
            totalConversions: 0,
            totalConversionsAmt: 0,
            dailyList
        };`;

code = code.replace(regex1, replacement1);
code = code.replace(regex2, replacement2);
fs.writeFileSync(path, code);
console.log("Patched dailyList sort successfully with regex!");
