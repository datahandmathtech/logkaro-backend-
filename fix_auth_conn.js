const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/authController.js';
let code = fs.readFileSync(path, 'utf8');

// Replace school connection
code = code.replace(/const schoolConn = await mongoose\.createConnection\(process\.env\.MONGODB_URI_SCHOOL\)\.asPromise\(\);/g, 
    "const schoolConn = mongoose.createConnection(process.env.MONGODB_URI_SCHOOL, { serverSelectionTimeoutMS: 5000 });\n                        await new Promise((resolve, reject) => {\n                            schoolConn.on('connected', resolve);\n                            schoolConn.on('error', reject);\n                        });");

// Replace modified fleet connection
code = code.replace(/const modConn = await mongoose\.createConnection\(process\.env\.MONGODB_URI_MODIFIED_FLEET\)\.asPromise\(\);/g, 
    "const modConn = mongoose.createConnection(process.env.MONGODB_URI_MODIFIED_FLEET, { serverSelectionTimeoutMS: 5000 });\n                        await new Promise((resolve, reject) => {\n                            modConn.on('connected', resolve);\n                            modConn.on('error', reject);\n                        });");

fs.writeFileSync(path, code);
console.log('Fixed authController.js dynamic connections');
