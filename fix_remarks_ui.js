const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

// 1. Revert InlineRemarkEditor UI
const inlineRegex = /<div style=\{\{ display: 'flex', gap: '4px', alignItems: 'center' \}\}>\s*<select[\s\S]*?<\/select>\s*<button[\s\S]*?<\/button>\s*<button[\s\S]*?<\/button>\s*<\/div>\s*<input\s*type="text"\s*value=\{text\}/;
const inlineReplacement = `<input 
                      type="text" 
                      value={text}`;
code = code.replace(inlineRegex, inlineReplacement);

// 2. Add Quick Remarks to the "Special Remarks" field in the Create Lead modal
// Find the textarea for specialRemarks
const specialRemarksRegex = /<label style=\{\{ fontSize: '12px', color: 'rgba\(255,255,255,0\.8\)', display: 'block', marginBottom: '4px' \}\}>Special Remarks \/ Notes<\/label>\s*<textarea/;
const specialRemarksReplacement = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Special Remarks / Notes</label>
                                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                              <select 
                                                  onChange={e => {
                                                      if (e.target.value) {
                                                          setFormData(prev => ({ ...prev, specialRemarks: prev.specialRemarks ? prev.specialRemarks + ' ' + e.target.value : e.target.value }));
                                                          e.target.value = "";
                                                      }
                                                  }}
                                                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', fontSize: '10px', outline: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                                              >
                                                  <option value="">Quick Remark...</option>
                                                  {customRemarks.map(r => <option key={r} value={r}>{r}</option>)}
                                              </select>
                                              <button type="button" onClick={() => {
                                                  const r = prompt('Add new Quick Remark:');
                                                  if (r && !customRemarks.includes(r)) {
                                                      const newR = [...customRemarks, r];
                                                      setCustomRemarks(newR);
                                                      localStorage.setItem('leadRemarks_' + selectedCompany?._id, JSON.stringify(newR));
                                                  }
                                              }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>+</button>
                                              <button type="button" onClick={() => {
                                                  if (customRemarks.length > 0 && window.confirm('Clear all custom quick remarks?')) {
                                                      setCustomRemarks([]);
                                                      localStorage.removeItem('leadRemarks_' + selectedCompany?._id);
                                                  }
                                              }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>-</button>
                                          </div>
                                      </div>
                                      <textarea`;
code = code.replace(specialRemarksRegex, specialRemarksReplacement);

fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
console.log('Fixed remarks UI');
