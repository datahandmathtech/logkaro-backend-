const fs = require('fs');

function fixCustomAxiosLogout(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const oldRedirect = "window.location.href = import.meta.env.BASE_URL + 'login';";
    const newRedirect = "window.location.href = '/login';";

    if (code.includes(oldRedirect)) {
        code = code.replace(oldRedirect, newRedirect);
        fs.writeFileSync(filePath, code);
        console.log('Fixed custom axios logout redirect in', filePath);
    }
}

fixCustomAxiosLogout('D:/Abhinandan/yatree-frontend-/src/api/axios.js');
fixCustomAxiosLogout('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/api/axios.js');
