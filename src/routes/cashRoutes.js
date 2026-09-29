const express = require('express');
const router = express.Router();
const {
    getCashTransactions,
    addCashTransaction,
    depositCashToBank,
    withdrawCashFromBank,
    updateCashTransaction,
    deleteCashTransaction
} = require('../controllers/cashController');
const { protect, adminOrExecutive } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/company/:companyId', getCashTransactions);
router.post('/transactions', adminOrExecutive, addCashTransaction);
router.post('/deposit-to-bank', adminOrExecutive, depositCashToBank);
router.post('/withdraw-from-bank', adminOrExecutive, withdrawCashFromBank);
router.put('/transactions/:id', adminOrExecutive, updateCashTransaction);
router.delete('/transactions/:id', adminOrExecutive, deleteCashTransaction);

module.exports = router;
