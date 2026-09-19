const fs = require('fs');
const path = 'E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/authController.js';
let code = fs.readFileSync(path, 'utf8');

// School
const oldSchool = `const schoolConn = mongoose.createConnection(process.env.MONGODB_URI_SCHOOL, { serverSelectionTimeoutMS: 5000 });
                        await new Promise((resolve, reject) => {
                            schoolConn.on('connected', resolve);
                            schoolConn.on('error', reject);
                        });`;
const newSchool = `const schoolConn = await mongoose.createConnection(process.env.MONGODB_URI_SCHOOL, { serverSelectionTimeoutMS: 5000 }).asPromise();`;
code = code.replace(oldSchool, newSchool);

// Modified
const oldMod = `const modConn = mongoose.createConnection(process.env.MONGODB_URI_MODIFIED_FLEET, { serverSelectionTimeoutMS: 5000 });
                        await new Promise((resolve, reject) => {
                            modConn.on('connected', resolve);
                            modConn.on('error', reject);
                        });`;
const newMod = `const modConn = await mongoose.createConnection(process.env.MONGODB_URI_MODIFIED_FLEET, { serverSelectionTimeoutMS: 5000 }).asPromise();`;
code = code.replace(oldMod, newMod);

fs.writeFileSync(path, code);
console.log('Fixed authController connection logic correctly');
