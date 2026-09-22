const fs = require('fs');

function fixAdminDashboard(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const oldEffect = `    useEffect(() => {
        if (!selectedCompany) return;
        fetchStats();
    }, [selectedCompany, selectedDate]);`;

    const newEffect = `    useEffect(() => {
        if (!selectedCompany) {
            setLoading(false);
            return;
        }
        fetchStats();
    }, [selectedCompany, selectedDate]);`;

    if (code.includes('if (!selectedCompany) return;')) {
        code = code.replace(oldEffect, newEffect);
        fs.writeFileSync(filePath, code);
        console.log('Fixed AdminDashboard in', filePath);
    }
}

fixAdminDashboard('D:/Abhinandan/yatree-frontend-/src/pages/AdminDashboard.jsx');
fixAdminDashboard('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/pages/AdminDashboard.jsx');
fixAdminDashboard('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/pages/AdminDashboard.jsx');
