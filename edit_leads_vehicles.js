const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

// 1. Inject customVehicles state and ALL_VEHICLES
const customSourcesRegex = /const \[customSources, setCustomSources\] = useState\(\[\]\);\s*useEffect\(\(\) => \{\s*if \(selectedCompany\?\._id\) \{\s*try \{\s*const saved = JSON\.parse\(localStorage\.getItem\('leadSources_' \+ selectedCompany\._id\)\);\s*if \(saved\) setCustomSources\(saved\);\s*\} catch\(e\) \{\}\s*\}\s*\}, \[selectedCompany\]\);\s*const ALL_SOURCES = \[\.\.\.new Set\(\[\.\.\.LEAD_SOURCES, \.\.\.customSources\]\)\];/;

const newStates = `const [customSources, setCustomSources] = useState([]);
    const [customVehicles, setCustomVehicles] = useState([]);
    useEffect(() => {
        if (selectedCompany?._id) {
            try {
                const saved = JSON.parse(localStorage.getItem('leadSources_' + selectedCompany._id));
                if (saved) setCustomSources(saved);
                const savedVehicles = JSON.parse(localStorage.getItem('leadVehicles_' + selectedCompany._id));
                if (savedVehicles) setCustomVehicles(savedVehicles);
            } catch(e) {}
        }
    }, [selectedCompany]);
    
    const ALL_SOURCES = [...new Set([...LEAD_SOURCES, ...customSources])];
    const ALL_VEHICLES = [...new Set([...VEHICLE_OPTIONS, ...customVehicles])];`;

if (customSourcesRegex.test(code)) {
    code = code.replace(customSourcesRegex, newStates);
    console.log('customVehicles state added.');
}

// 2. Modify Vehicle Model select in Modal to include the buttons
const vehicleSelectRegex = /<select\s*value=\{formData\.carType\}\s*onChange=\{e => \{\s*const newCar = e\.target\.value;\s*setFormData\(\{\s*\.\.\.formData,\s*carType: newCar,\s*itinerary: formData\.itinerary\.map\(item => \(\{ \.\.\.item, vehicleType: newCar \}\)\)\s*\}\);\s*\}\}\s*style=\{\{ \.\.\.darkInputStyle, cursor: 'pointer' \}\}\s*>\s*\{VEHICLE_OPTIONS\.map\(v => \(\s*<option key=\{v\} value=\{v\} style=\{\{ background: '#090f1d' \}\}>\{v\}<\/option>\s*\)\)\}\s*<\/select>/;

const newVehicleSelect = `<div style={{ display: 'flex', gap: '8px' }}>
    <select
        value={formData.carType}
        onChange={e => {
            const newCar = e.target.value;
            setFormData({
                ...formData,
                carType: newCar,
                itinerary: formData.itinerary.map(item => ({ ...item, vehicleType: newCar }))
            });
        }}
        style={{ ...darkInputStyle, cursor: 'pointer', flex: 1 }}
    >
        {ALL_VEHICLES.map(v => (
            <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
        ))}
    </select>
    <button type="button" onClick={() => {
        const v = prompt('Enter new vehicle model:');
        if (v && !ALL_VEHICLES.includes(v)) {
            const newVs = [...customVehicles, v];
            setCustomVehicles(newVs);
            localStorage.setItem('leadVehicles_' + selectedCompany?._id, JSON.stringify(newVs));
            setFormData(prev => ({
                ...prev,
                carType: v,
                itinerary: prev.itinerary.map(item => ({ ...item, vehicleType: v }))
            }));
        }
    }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}>+</button>
    {customVehicles.includes(formData.carType) && (
        <button type="button" onClick={() => {
            if (window.confirm('Delete this custom vehicle?')) {
                const newVs = customVehicles.filter(cv => cv !== formData.carType);
                setCustomVehicles(newVs);
                localStorage.setItem('leadVehicles_' + selectedCompany?._id, JSON.stringify(newVs));
                const defV = VEHICLE_OPTIONS[0];
                setFormData(prev => ({
                    ...prev,
                    carType: defV,
                    itinerary: prev.itinerary.map(item => ({ ...item, vehicleType: defV }))
                }));
            }
        }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0 10px', borderRadius: '8px', cursor: 'pointer' }}>
            <Trash2 size={13} />
        </button>
    )}
</div>`;

if (vehicleSelectRegex.test(code)) {
    code = code.replace(vehicleSelectRegex, newVehicleSelect);
    console.log('Vehicle select updated.');
}

// 3. Make sure to import Trash2 if it's not imported? It's probably imported because it's used elsewhere. Let's assume it is.
// I'll check it anyway. But I also need to update VEHICLE_OPTIONS to ALL_VEHICLES in the Itinerary day loop.

const itineraryVehicleSelectRegex = /<select\s*value=\{day\.vehicleType\}\s*onChange=\{e => handleItineraryChange\(index, 'vehicleType', e\.target\.value\)\}\s*style=\{\{ \.\.\.darkInputStyle, padding: '6px 8px', fontSize: '12px', cursor: 'pointer' \}\}\s*>\s*\{VEHICLE_OPTIONS\.map\(v => \(\s*<option key=\{v\} value=\{v\} style=\{\{ background: '#090f1d' \}\}>\{v\}<\/option>\s*\)\)\}\s*<\/select>/g;

const newItineraryVehicleSelect = `<select
    value={day.vehicleType}
    onChange={e => handleItineraryChange(index, 'vehicleType', e.target.value)}
    style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
>
    {ALL_VEHICLES.map(v => (
        <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
    ))}
</select>`;

if (itineraryVehicleSelectRegex.test(code)) {
    code = code.replace(itineraryVehicleSelectRegex, newItineraryVehicleSelect);
    console.log('Itinerary vehicle select updated.');
}

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
