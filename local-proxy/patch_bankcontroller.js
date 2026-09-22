const fs = require('fs');
const filePath = 'E:/New folder/Master-Server/TEXI/yatree-backend/src/controllers/bankController.js';
let code = fs.readFileSync(filePath, 'utf8');

const regex = /const deleteBankTransaction = asyncHandler\(async \(req, res\) => \{\n\s*const tx = await BankTransaction\.findById\(req\.params\.id\);/;
const replacement = `const deleteBankTransaction = asyncHandler(async (req, res) => {
    console.log("DELETE TRANSACTION HIT WITH ID:", req.params.id);
    const tx = await BankTransaction.findById(req.params.id);
    console.log("TRANSACTION FOUND?", !!tx);`;

code = code.replace(regex, replacement);
fs.writeFileSync(filePath, code);
console.log("Patched!");
