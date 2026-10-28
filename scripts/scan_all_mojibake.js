const fs = require('fs');
const path = require('path');

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist') {
            scanDir(full);
        } else if (e.isFile() && (full.endsWith('.jsx') || full.endsWith('.js'))) {
            const content = fs.readFileSync(full, 'utf8');
            if (content.includes('â‚¹') || content.includes('âžœ') || content.includes('Ã')) {
                console.log('Found in:', full);
            }
        }
    }
}

scanDir('yatree-frontend-/src');
scanDir('yatree-backend/src');
console.log('Scan complete.');
