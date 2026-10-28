const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../../yatree-frontend-/src/pages/OutsideCars.jsx');
let content = fs.readFileSync(targetPath, 'utf8');

const oldCodeRegex = /const fetchOutsideVehicles = async \(\) => \{[\s\S]*?finally \{ setLoading\(false\); \}\s*\};/;

const newCode = `const fetchOutsideVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const headers = { Authorization: \`Bearer \${userInfo?.token}\` };

            // Fetch company vehicles and outside vehicles concurrently in parallel
            const [compRes, outRes] = await Promise.all([
                axios.get(\`/api/admin/vehicles/\${selectedCompany._id}?usePagination=false\`, { headers }),
                axios.get(\`/api/admin/vehicles/\${selectedCompany._id}?usePagination=false&type=outside&includeBlocked=true\`, { headers })
            ]);

            const compVehs = compRes.data?.vehicles?.filter(v => !v.isOutsideCar && !v.eventId) || [];
            setCompanyVehicles(compVehs);
            const fleetPlates = new Set(compVehs.map(v => normalizePlate(v.carNumber)).filter(Boolean));

            const rawOutVehs = outRes.data?.vehicles?.filter(v => v.isOutsideCar) || [];
            const outVehs = rawOutVehs.filter(v => {
                const plate = normalizePlate(v.carNumber?.split('#')[0] || '');
                return !fleetPlates.has(plate);
            });
            setVehicles(outVehs);
        } catch (err) {
            console.error('Error fetching outside vehicles:', err);
        } finally {
            setLoading(false);
        }
    };`;

if (!oldCodeRegex.test(content)) {
    console.error("fetchOutsideVehicles regex not matched!");
    process.exit(1);
}

content = content.replace(oldCodeRegex, newCode);
fs.writeFileSync(targetPath, content, 'utf8');
console.log("Successfully fixed fetchOutsideVehicles!");
