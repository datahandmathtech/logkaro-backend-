const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/super-admin/client/src/pages/Tenants.jsx';
let code = fs.readFileSync(path, 'utf8');

// The block we want to replace:
const targetLabel = '<label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Identity Website</label>';

const replacementBlock = `<label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">CRM Product Type</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-indigo-700 outline-none focus:border-indigo-600/30 transition-all appearance-none cursor-pointer mb-6" value={formData.crmType || 'LogKaro Fleet'} onChange={e => setFormData({ ...formData, crmType: e.target.value })}>
                        <option value="LogKaro Fleet">LogKaro Fleet CRM</option>
                        <option value="School Management">School Management CRM</option>
                        <option value="Modified Fleet">Modified Fleet CRM</option>
                      </select>
                      
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Identity Website</label>`;

if (code.includes('CRM Product Type')) {
    console.log('Already updated');
} else {
    code = code.replace(targetLabel, replacementBlock);
    fs.writeFileSync(path, code);
    console.log('Successfully updated Tenants.jsx with CRM dropdown');
}
