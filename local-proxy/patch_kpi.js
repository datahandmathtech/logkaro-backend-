const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Revert filteredLeads
const filterRegex = /\/\/ User requested to show Confirmed leads in the Leads table too!\s*\/\/ if \(lead\.status === 'Confirmed' \|\| lead\.bookingId\) \{\s*\/\/     return false;\s*\/\/ \}/g;
const filterReplacement = `// Confirmed leads are moved to Confirmed Bookings page, so do not display them in Sales Leads table!
            if (lead.status === 'Confirmed' || lead.bookingId) {
                return false;
            }`;
code = code.replace(filterRegex, filterReplacement);

// 2. Update kpiData
const kpiRegex = /const kpiData = useMemo\(\(\) => \{[\s\S]*?\}, \[leads\]\);/;
const kpiReplacement = `const kpiData = useMemo(() => {
        let totalQuote = 0;

        filteredLeads.forEach(l => {
            const amt = Number(l.totalAmount) || 0;
            totalQuote += amt;
        });

        return {
            totalQuote,
            totalLeadsCount: filteredLeads.length
        };
    }, [filteredLeads]);`;
code = code.replace(kpiRegex, kpiReplacement);

// 3. Remove Converted Quote JSX
const convertedBoxRegex = /\{\/\* Converted Quote Card \*\/\}[\s\S]*?(?=\{\/\* Tally-Style Daily Breakdown Drawer Button \*\/\}|<!--)/;
code = code.replace(convertedBoxRegex, '');

fs.writeFileSync(path, code);
console.log("Patched Leads.jsx successfully!");
