const fs = require('fs');

function fixBridgeLogin(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    // Replace the incomplete JSON response in bridgeLogin
    const oldResponse = `res.json({
            _id: user._id,
            name: user.name,
            mobile: user.mobile,
            isProxy: true
        });`;

    const newResponse = `res.json({
            _id: user._id,
            name: user.name,
            mobile: user.mobile,
            role: user.role,
            company: user.company,
            salary: user.salary,
            monthlyLeaveAllowance: user.monthlyLeaveAllowance,
            permissions: user.permissions,
            token: generateToken(user._id),
            isProxy: true
        });`;

    if (code.includes('mobile: user.mobile,') && !code.includes('token: generateToken(user._id)')) {
        code = code.replace(oldResponse, newResponse);
        fs.writeFileSync(filePath, code);
        console.log('Fixed bridgeLogin in', filePath);
    }
}

fixBridgeLogin('E:/New folder/Master-Server/TEXI/Stundent-m/school-backend/src/controllers/authController.js');
