const express = require('express');
const router = express.Router();
const { 
    getTenants, 
    getTenantById, 
    createTenant, 
    updateTenant, 
    deleteTenant,
    loginAsTenant
} = require('../controllers/tenantController');
const { protect } = require('../middleware/superAdminAuth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

// Protected tenant management routes
router.route('/').get(protect, getTenants).post(protect, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), createTenant);
router.route('/:id').get(protect, getTenantById).put(protect, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), updateTenant).delete(protect, deleteTenant);
router.post('/:id/login-as', protect, loginAsTenant);

module.exports = router;
