const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const SuperAdmin = require('../models/SuperAdmin');

const protect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        res.status(401);
        throw new Error('Not authorized - no token');
    }
    try {
        const decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET);
        const admin = await SuperAdmin.findById(decoded.id).select('-password');
        if (!admin || admin.role !== 'superadmin') {
            res.status(401);
            throw new Error('Not authorized - invalid role');
        }
        req.superAdmin = admin;
        next();
    } catch (err) {
        res.status(401);
        throw new Error('Not authorized - token failed');
    }
});

module.exports = { protect };
