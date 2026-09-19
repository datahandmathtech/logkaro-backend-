const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

// 1. Add customRemarks state
const stateRegex = /const \[customVehicles, setCustomVehicles\] = useState\(\[\]\);/;
const stateReplacement = `const [customVehicles, setCustomVehicles] = useState([]);
    const [customRemarks, setCustomRemarks] = useState([]);`;
code = code.replace(stateRegex, stateReplacement);

// 2. Add localStorage logic for customRemarks
const loadRegex = /const savedVehicles = JSON\.parse\(localStorage\.getItem\('leadVehicles_' \+ selectedCompany\._id\)\);\s*if \(savedVehicles\) setCustomVehicles\(savedVehicles\);/;
const loadReplacement = `const savedVehicles = JSON.parse(localStorage.getItem('leadVehicles_' + selectedCompany._id));
                if (savedVehicles) setCustomVehicles(savedVehicles);
                const savedRemarks = JSON.parse(localStorage.getItem('leadRemarks_' + selectedCompany._id));
                if (savedRemarks) setCustomRemarks(savedRemarks);`;
code = code.replace(loadRegex, loadReplacement);

// 3. Add Quick Remarks dropdown to the inline remark input
const remarkInputRegex = /<input\s*type="text"\s*value=\{text\}\s*onChange=\{e => setText\(e\.target\.value\)\}\s*onKeyDown=\{e => e\.key === 'Enter' && handleSave\(\)\}\s*placeholder="Type remark & press Enter\.\.\."\s*style=\{\{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '11px', outline: 'none' \}\}\s*\/>/;
const remarkInputReplacement = `<div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <select 
                          onChange={e => {
                              if (e.target.value) {
                                  setText(e.target.value);
                                  e.target.value = "";
                              }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: '10px', outline: 'none', cursor: 'pointer', maxWidth: '80px', textOverflow: 'ellipsis' }}
                      >
                          <option value="">Quick...</option>
                          {customRemarks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button type="button" onClick={() => {
                          const r = prompt('Add new Quick Remark:');
                          if (r && !customRemarks.includes(r)) {
                              const newR = [...customRemarks, r];
                              setCustomRemarks(newR);
                              localStorage.setItem('leadRemarks_' + selectedCompany?._id, JSON.stringify(newR));
                              setText(r);
                          }
                      }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>+</button>
                      <button type="button" onClick={() => {
                          if (customRemarks.length > 0 && window.confirm('Clear all custom quick remarks?')) {
                              setCustomRemarks([]);
                              localStorage.removeItem('leadRemarks_' + selectedCompany?._id);
                          }
                      }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>-</button>
                  </div>
                  <input 
                      type="text" 
                      value={text} 
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      placeholder="Type remark & press Enter..." 
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '11px', outline: 'none' }}
                  />`;
code = code.replace(remarkInputRegex, remarkInputReplacement);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
console.log('Added customRemarks to Leads.jsx');
