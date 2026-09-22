const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

// @desc    Auth Super Admin & get token
// @route   POST /api/auth/login
// @access  Public
const loginSuperAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const admin = await SuperAdmin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
        admin.lastLoginAt = Date.now();
        await admin.save();

        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            token: generateToken(admin._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Get Super Admin profile
// @route   GET /api/auth/me
// @access  Private
const getSuperAdminProfile = asyncHandler(async (req, res) => {
    const admin = await SuperAdmin.findById(req.superAdmin._id);

    if (admin) {
        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.SUPER_ADMIN_JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = {
    loginSuperAdmin,
    getSuperAdminProfile,
};
