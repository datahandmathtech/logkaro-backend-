const express = require('express');
const router = express.Router();
const { loginSuperAdmin, getSuperAdminProfile } = require('../controllers/authController');
const { protect } = require('../middleware/superAdminAuth');

// Protected route for testing
router.post('/login', loginSuperAdmin);
router.get('/me', protect, getSuperAdminProfile);

module.exports = router;
