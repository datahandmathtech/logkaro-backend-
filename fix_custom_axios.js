const fs = require('fs');

function fixCustomAxios(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    // Fix the redirect
    code = code.replace(/window\.location\.href = '\/login';/g, "window.location.href = import.meta.env.BASE_URL + 'login';");

    // Add path interceptor logic
    const interceptorLogic = `
instance.interceptors.request.use((config) => {
    if (config.url && config.url.startsWith('/api')) {
        let base = import.meta.env.BASE_URL || '/';
        if (base.endsWith('/')) base = base.slice(0, -1);
        config.url = base + config.url;
    }
    return config;
});
`;
    if (!code.includes("import.meta.env.BASE_URL || '/'")) {
        // Insert it right after const instance = axios.create(...)
        const createIndex = code.indexOf('axios.create({');
        const endOfCreate = code.indexOf('});', createIndex) + 3;
        code = code.slice(0, endOfCreate) + interceptorLogic + code.slice(endOfCreate);
        
        fs.writeFileSync(filePath, code);
        console.log('Fixed custom axios in', filePath);
    }
}

fixCustomAxios('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/api/axios.js');
fixCustomAxios('D:/Abhinandan/yatree-frontend-/src/api/axios.js');
