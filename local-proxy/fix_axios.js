const fs = require('fs');

function addAxiosInterceptor(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');
    if (code.includes('axios.interceptors.request.use')) return; // already added

    const interceptorCode = `\nimport axios from 'axios';\naxios.interceptors.request.use((config) => {\n    if (config.url && config.url.startsWith('/api')) {\n        let base = import.meta.env.BASE_URL || '/';\n        if (base.endsWith('/')) base = base.slice(0, -1);\n        config.url = base + config.url;\n    }\n    return config;\n});\n`;
    
    // insert after imports
    const lastImportIndex = code.lastIndexOf('import ');
    const endOfLastImport = code.indexOf('\n', lastImportIndex);
    code = code.slice(0, endOfLastImport) + interceptorCode + code.slice(endOfLastImport);
    
    fs.writeFileSync(filePath, code);
    console.log('Added axios interceptor to', filePath);
}

// Also fix AuthContext logout redirect!
function fixAuthContext(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');
    if (code.includes("window.location.href = import.meta.env.BASE_URL + 'login'")) return;
    
    code = code.replace(/window\.location\.href = '\/login';/g, "window.location.href = import.meta.env.BASE_URL + 'login';");
    fs.writeFileSync(filePath, code);
    console.log('Fixed logout redirect in', filePath);
}

addAxiosInterceptor('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/main.jsx');
addAxiosInterceptor('D:/Abhinandan/yatree-frontend-/src/main.jsx');

fixAuthContext('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/context/AuthContext.jsx');
fixAuthContext('D:/Abhinandan/yatree-frontend-/src/context/AuthContext.jsx');

