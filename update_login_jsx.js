const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Login.jsx', 'utf8');

const regex = /const user = await login\(mobile, password\);\s*\/\/\s*dY>,\?\s*MULTI-TENANCY SYNC: Clear old selected company on new login to prevent 403s\s*localStorage\.removeItem\('selectedCompany'\);\s*const role = user\.role\?\.toLowerCase\(\) \|\| '';/m;

const replacement = `const user = await login(mobile, password);
            if (!user) return; // Wait for SSO Redirect to kick in

            // dY>,? MULTI-TENANCY SYNC: Clear old selected company on new login to prevent 403s
            localStorage.removeItem('selectedCompany');

            const role = user.role?.toLowerCase() || '';`;

code = code.replace(regex, replacement);
fs.writeFileSync('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/Login.jsx', code);
console.log('Modified Login.jsx');
