const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/super-admin/client/src/pages/Tenants.jsx', 'utf8');

// 1. Add crmType to the initial state
code = code.replace(/companyName: '',\s*ownerName: '',/, "crmType: 'LogKaro Fleet',\n      companyName: '',\n      ownerName: '',");
code = code.replace(/companyName: tenant\.companyName \|\| '',/, "crmType: tenant.crmType || 'LogKaro Fleet',\n        companyName: tenant.companyName || '',");
code = code.replace(/companyName: '',\s*ownerName: '',/g, "crmType: 'LogKaro Fleet',\n          companyName: '',\n          ownerName: '',");

// 2. Add CRM Type dropdown to the form
const formBlock = `<div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Identity Website</label>`;
                        
const newFormBlock = `<div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">CRM Product Type</label>
                        <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black text-indigo-700 outline-none focus:border-indigo-600/30 transition-all appearance-none cursor-pointer" value={formData.crmType} onChange={e => setFormData({ ...formData, crmType: e.target.value })}>
                          <option value="LogKaro Fleet">LogKaro Fleet CRM</option>
                          <option value="School Management">School Management CRM</option>
                          <option value="Modified Fleet">Modified Fleet CRM</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Identity Website</label>`;

code = code.replace(formBlock, newFormBlock);
code = code.replace(/<div className="grid grid-cols-2 gap-8">\s*<div className="space-y-2">\s*<label className="text-\[10px\] font-black text-slate-400 uppercase tracking-\[2px\] ml-1">CRM Product Type/, '<div className="grid grid-cols-3 gap-8">\n                      <div className="space-y-2">\n                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">CRM Product Type');

// 3. Append CRM type to formData in handleSubmit
code = code.replace(/append\('companyName', formData\.companyName\)/, "append('crmType', formData.crmType);\n      formDataObj.append('companyName', formData.companyName)");

// 4. Display CRM type badge in the table
const badgeRegex = /\{tenant\.status === 'active' \? 'OPERATIONAL' : tenant\.status === 'suspended' \? 'LOCKED' : 'TRIAL'\}/;
const badgeReplacement = `{tenant.status === 'active' ? 'OPERATIONAL' : tenant.status === 'suspended' ? 'LOCKED' : 'TRIAL'}
                          </div>
                          <div className="mt-2 text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded inline-block">
                            {tenant.crmType || 'LogKaro Fleet'}`;

code = code.replace(badgeRegex, badgeReplacement);

fs.writeFileSync('E:/New folder/Master-Server/TEXI/super-admin/client/src/pages/Tenants.jsx', code);
console.log('Modified Tenants.jsx');
