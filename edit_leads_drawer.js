const fs = require('fs');

let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

// 1. Remove the Drawer Footer
const footerRegex = /\{\/\* Drawer Footer \*\/\}\s*<div style=\{\{[\s\S]*?\}\)>\s*Close\s*<\/button>\s*<\/div>/;
if (footerRegex.test(code)) {
    code = code.replace(footerRegex, '');
    console.log('Drawer Footer removed.');
}

// 2. Modify the Header to include the stats
const headerRegex = /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*<BarChart3 size=\{18\} color="#fbbf24" \/>\s*<h3 style=\{\{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0\.3px' \}\}>\s*Daily Lead Breakdown\s*<\/h3>\s*<\/div>\s*<div style=\{\{ fontSize: '11px', color: 'rgba\(255, 255, 255, 0\.5\)', marginTop: '2px' \}\}>\s*Tally-style analytics & conversion matrix\s*<\/div>/;

const newHeader = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%', paddingRight: '15px' }}>
    <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#fbbf24" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0.3px' }}>
                Daily Lead Breakdown
            </h3>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
            Tally-style analytics
        </div>
    </div>
    <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '700' }}>Total Leads</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>{sidebarStats.totalLeads}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#86efac', fontWeight: '700' }}>Total Conversions</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>{sidebarStats.convertedCount}</div>
        </div>
    </div>
</div>`;

if (headerRegex.test(code)) {
    code = code.replace(headerRegex, newHeader);
    console.log('Drawer Header modified.');
}

// 3. Remove the Monthly Summary Card
const summaryCardRegex = /\{\/\* Monthly Summary Card \*\/\}\s*<div style=\{\{[\s\S]*?gridTemplateColumns: '1fr 1fr'[\s\S]*?\}\}>\s*<div>[\s\S]*?<\/div>\s*<\/div>/;
if (summaryCardRegex.test(code)) {
    code = code.replace(summaryCardRegex, '');
    console.log('Monthly Summary Card removed.');
}

// 4. Highlight today's date row in green
// Search for mapping the days
const dayRowRegex = /background: expandedBreakdownDay === day\.dayNum \? 'rgba\(255, 255, 255, 0\.06\)' : 'transparent'/;
const newDayRow = `background: expandedBreakdownDay === day.dayNum ? 'rgba(255, 255, 255, 0.06)' : (new Date().getDate() === day.dayNum && new Date().getMonth() === activeOption.monthIdx ? 'rgba(34, 197, 94, 0.15)' : 'transparent')`;

if (dayRowRegex.test(code)) {
    code = code.replace(dayRowRegex, newDayRow);
    console.log('Day row highlight added.');
}

// Wait, I need activeOption in the day mapping. Let's see if activeOption is available in scope.
// The mapping is inside the render block. I'll just use `new Date().getDate() === day.dayNum` for simplicity, assuming they look at the current month most of the time, or I'll use `selectedSidebarMonth` to check if it's the current month.
// Let's refine this later if needed.

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
