const fs = require('fs');
const content = fs.readFileSync('yatree-frontend-/src/pages/OutsideCars.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('â')) {
        console.log((i + 1) + ': ' + l.trim());
    }
});
