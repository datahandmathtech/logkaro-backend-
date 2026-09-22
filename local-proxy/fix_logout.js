const fs = require('fs');

function fixLogoutRedirect(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    // Make logout always redirect to the root universal login page
    const oldLogout = "window.location.href = import.meta.env.BASE_URL + 'login';";
    const newLogout = "window.location.href = '/login';";

    if (code.includes(oldLogout)) {
        code = code.replace(oldLogout, newLogout);
        fs.writeFileSync(filePath, code);
        console.log('Fixed logout redirect in', filePath);
    }
}

fixLogoutRedirect('D:/Abhinandan/yatree-frontend-/src/context/AuthContext.jsx');
fixLogoutRedirect('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/context/AuthContext.jsx');
