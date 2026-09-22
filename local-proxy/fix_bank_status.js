const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bankController.js', 'utf8');

code = code.replace("lead.status = 'Open';", "lead.status = 'New';");

fs.writeFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bankController.js', code);
console.log('Fixed bankController.js');
