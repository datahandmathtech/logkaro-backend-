const fs = require('fs');

function fixBridgeLogout(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const oldLogout = `if (logout) logout();`;
    const newLogout = `
                localStorage.removeItem('userInfo');
                localStorage.removeItem('selectedCompany');
                localStorage.removeItem('selectedDate');
    `;

    if (code.includes(oldLogout)) {
        code = code.replace(oldLogout, newLogout);
        fs.writeFileSync(filePath, code);
        console.log('Fixed Bridge.jsx in', filePath);
    }
}

fixBridgeLogout('D:/Abhinandan/yatree-frontend-/src/pages/Bridge.jsx');
fixBridgeLogout('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/pages/Bridge.jsx');
