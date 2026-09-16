const express = require('express');
const router = express.Router();
const {
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getBankTransactions,
    addBankTransaction,
    deleteBankTransaction
} = require('../controllers/bankController');
const { protect, adminOrExecutive } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(adminOrExecutive, createBankAccount);

router.route('/company/:companyId')
    .get(getBankAccounts);

router.route('/:id')
    .put(adminOrExecutive, updateBankAccount)
    .delete(adminOrExecutive, deleteBankAccount);

router.route('/transactions/company/:companyId')
    .get(getBankTransactions);

router.route('/transactions')
    .post(adminOrExecutive, addBankTransaction);

router.route('/transactions/:id')
    .delete(adminOrExecutive, deleteBankTransaction);

module.exports = router;
