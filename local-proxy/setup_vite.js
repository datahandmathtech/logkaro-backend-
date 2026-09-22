const fs = require('fs');

// 1. School Frontend
const schoolPath = 'E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/vite.config.js';
let schoolCode = fs.readFileSync(schoolPath, 'utf8');
if (!schoolCode.includes("base: '/school/'")) {
    schoolCode = schoolCode.replace(/export default defineConfig\(\{/, "export default defineConfig({\n  base: '/school/',");
    fs.writeFileSync(schoolPath, schoolCode);
    console.log('Added base to School frontend');
}

// 2. Modified Fleet Frontend
const modifiedPath = 'D:/Abhinandan/yatree-frontend-/vite.config.js';
let modifiedCode = fs.readFileSync(modifiedPath, 'utf8');
if (!modifiedCode.includes("base: '/fleet/'")) {
    modifiedCode = modifiedCode.replace(/export default defineConfig\(\{/, "export default defineConfig({\n  base: '/fleet/',");
    fs.writeFileSync(modifiedPath, modifiedCode);
    console.log('Added base to Modified Fleet frontend');
}

