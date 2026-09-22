const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/routes/bankRoutes.js', 'utf8');

code = code.replace('deleteBankTransaction', 'deleteBankTransaction,\n    updateBankTransaction');
code = code.replace('.delete(adminOrExecutive, deleteBankTransaction);', '.put(adminOrExecutive, updateBankTransaction)\n    .delete(adminOrExecutive, deleteBankTransaction);');

fs.writeFileSync('E:/New folder/Master-Server/TEXI/yatree-backend/src/routes/bankRoutes.js', code);
console.log('bankRoutes patched');
