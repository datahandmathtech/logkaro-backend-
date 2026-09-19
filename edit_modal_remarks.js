const fs = require('fs');
let code = fs.readFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', 'utf8');

const modalInputRegex = /<input type="text" id="newRemarkText" placeholder="Type new remark\.\.\." style=\{\{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba\(255,255,255,0\.1\)', background: 'rgba\(0,0,0,0\.4\)', color: 'white', outline: 'none' \}\} \/>/;
const modalInputReplacement = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <select 
                                                          onChange={e => {
                                                              if(e.target.value) {
                                                                  document.getElementById('newRemarkText').value = e.target.value;
                                                                  e.target.value = "";
                                                              }
                                                          }}
                                                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', padding: '12px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}
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
                                                              document.getElementById('newRemarkText').value = r;
                                                          }
                                                      }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 16px', borderRadius: '12px', cursor: 'pointer' }}>+</button>
                                                  </div>
                                                  <input type="text" id="newRemarkText" placeholder="Type new remark..." style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: 'white', outline: 'none' }} />`;

if (code.includes('Quick Remark...')) {
    console.log('Already added modal remarks');
} else {
    code = code.replace(modalInputRegex, modalInputReplacement);
    fs.writeFileSync('e:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Leads.jsx', code);
    console.log('Added customRemarks to modal');
}
