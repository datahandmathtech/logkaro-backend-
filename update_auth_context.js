const fs = require('fs');
let code = fs.readFileSync('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/context/AuthContext.jsx', 'utf8');

const loginRegex = /const login = async \(mobile, password\) => \{[\s\S]*?const \{ data \} = await axios\.post\('\/api\/auth\/login', \{ mobile, password \}\);[\s\S]*?localStorage\.setItem\('userInfo', JSON\.stringify\(data\)\);[\s\S]*?sessionStorage\.setItem\('activeSession', 'true'\);[\s\S]*?setUser\(data\);[\s\S]*?return data;[\s\S]*?\};/;

const newLogin = `const login = async (mobile, password) => {
        const { data } = await axios.post('/api/auth/login', { mobile, password });
        if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
            return null;
        }
        localStorage.setItem('userInfo', JSON.stringify(data));
        sessionStorage.setItem('activeSession', 'true'); // Set session on login
        setUser(data);
        return data;
    };`;

code = code.replace(loginRegex, newLogin);
fs.writeFileSync('E:/New folder/Master-Server/TEXI/yatree-frontend-/src/context/AuthContext.jsx', code);
console.log('Modified AuthContext.jsx');
