const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/super-admin/client/src/pages/Tenants.jsx';
let code = fs.readFileSync(path, 'utf8');

// Also add it to initial state if it's not there
if (!code.includes("crmType: 'LogKaro Fleet'")) {
    code = code.replace(/companyName: '',/g, "crmType: 'LogKaro Fleet',\n      companyName: '',");
    code = code.replace(/companyName: tenant\.companyName \|\| '',/g, "crmType: tenant.crmType || 'LogKaro Fleet',\n        companyName: tenant.companyName || '',");
    fs.writeFileSync(path, code);
    console.log('Added crmType to formData initial states');
} else {
    console.log('crmType already in formData');
}

if (!code.includes("append('crmType', formData.crmType)")) {
    code = code.replace(/append\('companyName', formData\.companyName\)/, "append('crmType', formData.crmType);\n      formDataObj.append('companyName', formData.companyName)");
    fs.writeFileSync(path, code);
    console.log('Added crmType to append logic');
}

if (!code.includes("{tenant.crmType || 'LogKaro Fleet'}")) {
    const badgeRegex = /\{tenant\.status === 'active' \? 'OPERATIONAL' : tenant\.status === 'suspended' \? 'LOCKED' : 'TRIAL'\}\s*<\/div>/;
    const badgeReplacement = `{tenant.status === 'active' ? 'OPERATIONAL' : tenant.status === 'suspended' ? 'LOCKED' : 'TRIAL'}
                          </div>
                          <div className="mt-2 ml-3 text-xs font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded inline-block">
                            {tenant.crmType || 'LogKaro Fleet'}
                          </div>`;
    code = code.replace(badgeRegex, badgeReplacement);
    fs.writeFileSync(path, code);
    console.log('Added crmType badge to table');
}

