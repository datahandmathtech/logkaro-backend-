const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

// 1. SCHOOL CRM ROUTING (/school)
app.use('/school/api', createProxyMiddleware({
    target: 'http://localhost:5006',
    changeOrigin: true,
    pathRewrite: { '^/': '/api/' }, // Re-add /api that express strips
}));
app.use('/school', createProxyMiddleware({
    target: 'http://localhost:5175',
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/': '/school/' }, // Re-add /school that express strips
}));

// 2. MODIFIED FLEET CRM ROUTING (/fleet)
app.use('/fleet/api', createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/': '/api/' },
}));
app.use('/fleet', createProxyMiddleware({
    target: 'http://localhost:5176',
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/': '/fleet/' }, // Re-add /fleet that express strips
}));

// 3. MAIN FLEET (Fallback / Default)
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5005',
    changeOrigin: true,
    pathRewrite: { '^/': '/api/' },
}));
app.use('/', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
}));

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 LOCAL UNIFIED DOMAIN PROXY RUNNING 🚀`);
    console.log(`=========================================`);
    console.log(`Test as if it's your live domain:`);
    console.log(`- Main Fleet:     http://localhost:${PORT}/`);
    console.log(`- School CRM:     http://localhost:${PORT}/school/`);
    console.log(`- Modified Fleet: http://localhost:${PORT}/fleet/`);
    console.log(`=========================================`);
});
