const fs = require('fs');

function fixBridgeLoginRegex(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const regex = /res\.json\(\{\s*_id:\s*user\._id,\s*name:\s*user\.name,\s*mobile:\s*user\.mobile,\s*isProxy:\s*true\s*\}\);/;

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

    if (regex.test(code)) {
        code = code.replace(regex, newResponse);
        fs.writeFileSync(filePath, code);
        console.log('Fixed bridgeLogin with regex in', filePath);
    } else {
        console.log('Regex did not match in', filePath);
    }
}

fixBridgeLoginRegex('E:/New folder/Master-Server/TEXI/Stundent-m/school-backend/src/controllers/authController.js');
