const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./src/models/User');
    const user = await User.findOne({ name: 'Yatree' }); 
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    const http = require('http');
    const req = http.request({
        hostname: '127.0.0.1',
        port: 5005,
        path: '/api/bookings/' + user.company,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            console.log('API Status:', res.statusCode);
            const data = JSON.parse(body);
            console.log('Returned items:', Array.isArray(data) ? data.length : 'not an array');
            if (Array.isArray(data) && data.length > 0) {
                const conf = data.filter(d => d.bookingStatus === 'Confirmed');
                console.log('Confirmed in array:', conf.length);
            }
            process.exit(0);
        });
    });
    req.end();
});
