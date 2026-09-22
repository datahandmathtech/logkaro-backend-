const fs = require('fs');

function fixAdminDashboard(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    if (code.includes('if (!selectedCompany) return;')) {
        code = code.replace('if (!selectedCompany) return;', 'if (!selectedCompany) { setLoading(false); return; }');
        fs.writeFileSync(filePath, code);
        console.log('Fixed AdminDashboard in', filePath);
    }
}

fixAdminDashboard('D:/Abhinandan/yatree-frontend-/src/pages/AdminDashboard.jsx');
fixAdminDashboard('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/pages/AdminDashboard.jsx');
fixAdminDashboard('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/AdminDashboard.jsx');
