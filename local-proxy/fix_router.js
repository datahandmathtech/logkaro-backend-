const fs = require('fs');

function updateBasename(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');
    if (code.includes('<Router basename={import.meta.env.BASE_URL}>') || code.includes('<Router basename=')) {
        return; // Already updated
    }
    code = code.replace(/<Router>/g, '<Router basename={import.meta.env.BASE_URL}>');
    fs.writeFileSync(filePath, code);
    console.log('Updated', filePath);
}

// Update School App.jsx
updateBasename('E:/New folder/Master-Server/TEXI/Stundent-m/school-frontend/src/App.jsx');

// Update Modified Fleet App.jsx
updateBasename('D:/Abhinandan/yatree-frontend-/src/App.jsx');

