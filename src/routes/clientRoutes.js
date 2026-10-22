const express = require('express');
const router = express.Router();
const {
    getClients,
    getClientLedger,
    addPayment,
    updateClient,
    createClient,
    updateLedgerEntry,
    deleteLedgerEntry
} = require('../controllers/clientController');
const { protect, adminOrExecutive, checkCompany } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(adminOrExecutive, createClient);

router.route(['/company/:companyId', '/:companyId'])
    .get(adminOrExecutive, checkCompany, getClients);

router.route('/ledger/:id')
    .put(adminOrExecutive, updateLedgerEntry)
    .delete(adminOrExecutive, deleteLedgerEntry);

router.route('/:id/ledger')
    .get(adminOrExecutive, getClientLedger);

router.route('/:id/payment')
    .post(adminOrExecutive, addPayment);

router.route('/:id')
    .put(adminOrExecutive, updateClient);

module.exports = router;
