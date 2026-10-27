const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../../yatree-frontend-/dist');
const dest = path.resolve(__dirname, '../dist');

if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log("Successfully copied frontend dist to backend dist!");
} else {
    console.error("Frontend dist folder does not exist yet!");
}
