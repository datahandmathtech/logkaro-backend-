const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/super-admin/client/src/pages/Tenants.jsx', 'utf8');
code = code.replace(/crmType: 'LogKaro Fleet',\s+crmType: 'LogKaro Fleet',/, "crmType: 'LogKaro Fleet',");
fs.writeFileSync('E:/New folder/Master-Server/TEXI/super-admin/client/src/pages/Tenants.jsx', code);
