const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../../yatree-frontend-/src/pages/OutsideCars.jsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add normalizePlate helper if not present
if (!content.includes('const normalizePlate =')) {
    content = content.replace(
        'const OutsideCars = () => {',
        `const normalizePlate = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();\n\nconst OutsideCars = () => {`
    );
}

// 2. Update fetchOutsideVehicles plate normalization
content = content.replace(
    /const fleetPlates = new Set\(compVehs\.map\(v => \(v\.carNumber \|\| ''\)\.trim\(\)\.toUpperCase\(\)\)\);[\s\S]*?return !fleetPlates\.has\(plate\);[\s\S]*?\}\);/m,
    `const fleetPlates = new Set(compVehs.map(v => normalizePlate(v.carNumber)).filter(Boolean));
            const outVehs = (data.vehicles?.filter(v => v.isOutsideCar) || []).filter(v => {
                const plate = normalizePlate(v.carNumber?.split('#')[0] || '');
                return !fleetPlates.has(plate);
            });`
);

// 3. Update fleetPlateSet and validOutsideVehicles
content = content.replace(
    /const fleetPlateSet = useMemo\(\(\) => \{[\s\S]*?return new Set\(\(companyVehicles \|\| \[\]\)\.map\(v => \(v\.carNumber \|\| ''\)\.trim\(\)\.toUpperCase\(\)\)\);[\s\S]*?\}, \[companyVehicles\]\);[\s\S]*?const validOutsideVehicles = useMemo\(\(\) => \{[\s\S]*?const cleanCarNumber = \(v\.carNumber\?\.split\('#'\)\[0\] \|\| ''\)\.trim\(\)\.toUpperCase\(\);[\s\S]*?return !fleetPlateSet\.has\(cleanCarNumber\);[\s\S]*?\}, \[vehicles, fleetPlateSet\]\);/m,
    `const fleetPlateSet = useMemo(() => {
        return new Set((companyVehicles || []).map(v => normalizePlate(v.carNumber)).filter(Boolean));
    }, [companyVehicles]);

    const validOutsideVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const cleanCarNumber = normalizePlate(v.carNumber?.split('#')[0] || '');
            return !fleetPlateSet.has(cleanCarNumber);
        });
    }, [vehicles, fleetPlateSet]);`
);

// 4. In vendorAggregates: exclude any fleet vehicle plates
content = content.replace(
    /const carPlate = v\.carNumber\?\.split\('#'\)\[0\];[\s\S]*?if \(carPlate\) vMap\[ownerKey\]\.vehicles\.add\(carPlate\);/m,
    `const rawPlate = v.carNumber?.split('#')[0];
            if (rawPlate && !fleetPlateSet.has(normalizePlate(rawPlate))) {
                vMap[ownerKey].vehicles.add(rawPlate);
            }`
);

// 5. Add Calendar Navigation helpers
const calHelpers = `    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const handlePrevMonth = () => {
        if (selectedMonth === 'All') {
            setSelectedYear(prev => prev - 1);
            return;
        }
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
        setSelectedDay('All');
    };

    const handleNextMonth = () => {
        if (selectedMonth === 'All') {
            setSelectedYear(prev => prev + 1);
            return;
        }
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
        setSelectedDay('All');
    };

    const handleJumpToCurrentMonth = () => {
        const now = new Date();
        setSelectedMonth(now.getMonth() + 1);
        setSelectedYear(now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear());
        setSelectedDay('All');
    };
`;

if (!content.includes('const handlePrevMonth =')) {
    content = content.replace('// ── DYNAMIC FILTERS ──', `${calHelpers}\n    // ── DYNAMIC FILTERS ──`);
}

// 6. Replace the narrow select dropdowns and the redundant Add Duty button
const oldCalPattern = /<div style=\{\{ display: 'flex', gap: '6px' \}\}>[\s\S]*?<\/select>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<div style=\{\{ display: 'flex', gap: '8px' \}\}>[\s\S]*?<button onClick=\{handleOpenLogDuty\}[\s\S]*?<\/button>[\s\S]*?<button onClick=\{handleExportPDF\}[\s\S]*?<\/button>[\s\S]*?<\/div>/m;

const newCalMarkup = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button 
                                type="button"
                                onClick={handlePrevMonth}
                                title="Previous Month"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
                                <Calendar size={15} color={theme.primary} />
                                <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', minWidth: '120px', textAlign: 'center' }}>
                                    {selectedMonth === 'All' ? \`FY \${selectedYear}-\${selectedYear + 1}\` : \`\${fullMonthNames[selectedMonth - 1]} \${selectedMonth <= 3 ? selectedYear + 1 : selectedYear}\`}
                                </span>
                            </div>

                            <button 
                                type="button"
                                onClick={handleNextMonth}
                                title="Next Month"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedMonth === 'All') {
                                        handleJumpToCurrentMonth();
                                    } else {
                                        setSelectedMonth('All');
                                        setSelectedDay('All');
                                    }
                                }}
                                style={{
                                    padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: selectedMonth === 'All' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                                    color: selectedMonth === 'All' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                    fontSize: '11px', fontWeight: '800'
                                }}
                            >
                                {selectedMonth === 'All' ? 'Monthly View' : 'Full Year'}
                            </button>
                        </div>
                    </div>`;

if (oldCalPattern.test(content)) {
    content = content.replace(oldCalPattern, newCalMarkup);
} else {
    console.log("oldCalPattern not matched directly, checking alternative...");
}

// 7. Fix the massive plate text in the Vendor Modal header
const oldModalPlatePattern = /<p style=\{\{ color: 'rgba\(255,255,255,0\.4\)', fontSize: '12px', fontWeight: '700', margin: '4px 0 0 0' \}\}>[\s\S]*?Plates: \{selectedVendorForLedger\.vehicles\.join\(', '\) \|\| 'N\/A'\} • Total Duties: \{selectedVendorForLedger\.totalDuties\}[\s\S]*?<\/p>/;

const newModalPlateMarkup = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                                {selectedVendorForLedger.totalDuties} Duties • {selectedVendorForLedger.vehicles.length} Vehicle(s):
                                            </span>
                                            {selectedVendorForLedger.vehicles.slice(0, 5).map(p => (
                                                <span key={p} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>
                                                    {p}
                                                </span>
                                            ))}
                                            {selectedVendorForLedger.vehicles.length > 5 && (
                                                <span style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' }}>
                                                    +{selectedVendorForLedger.vehicles.length - 5} more
                                                </span>
                                            )}
                                        </div>`;

if (oldModalPlatePattern.test(content)) {
    content = content.replace(oldModalPlatePattern, newModalPlateMarkup);
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log("OutsideCars.jsx successfully updated with plate normalization, clean calendar UX, and fixed modal header!");
