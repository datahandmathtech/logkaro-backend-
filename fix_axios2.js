const fs = require('fs');

function addPathLogic(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');
    if (code.includes('import.meta.env.BASE_URL')) return;

    const logic = `\n    if (config.url && config.url.startsWith('/api')) {\n        let base = import.meta.env.BASE_URL || '/';\n        if (base.endsWith('/')) base = base.slice(0, -1);\n        config.url = base + config.url;\n    }\n`;
    
    code = code.replace(/axios\.interceptors\.request\.use\(\(config\) => \{/, "axios.interceptors.request.use((config) => {" + logic);
    
    fs.writeFileSync(filePath, code);
    console.log('Added path logic to', filePath);
}

addPathLogic('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/main.jsx');
addPathLogic('D:/Abhinandan/yatree-frontend-/src/main.jsx');
