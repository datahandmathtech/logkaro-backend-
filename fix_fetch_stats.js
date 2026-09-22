const fs = require('fs');

function fixFetchStats(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const oldLogic = "if (!userInfoRaw || !selectedCompany) return;";
    const newLogic = "if (!userInfoRaw || !selectedCompany) { setLoading(false); return; }";

    if (code.includes(oldLogic)) {
        code = code.replace(oldLogic, newLogic);
        fs.writeFileSync(filePath, code);
        console.log('Fixed fetchStats in', filePath);
    }
}

fixFetchStats('D:/Abhinandan/yatree-frontend-/src/pages/AdminDashboard.jsx');
fixFetchStats('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/pages/AdminDashboard.jsx');
fixFetchStats('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/AdminDashboard.jsx');
