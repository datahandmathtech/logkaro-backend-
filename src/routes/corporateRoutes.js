const express = require('express');
const router = express.Router();
const {
    // 1. Contracts
    getContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,

    // 2. Daily Register
    getDailyRegister,
    prefillDailyRegister,
    clearDailyRegister,
    updateDailyRegisterEntry,
    bulkSaveDailyRegister,
    getMonthRegisterSummary,

    // 3. On-call Duty Slips
    getDutySlips,
    getDutySlipById,
    createDutySlip,
    updateDutySlip,
    approveDutySlip,
    deleteDutySlip,

    // 4. Monthly Statement & Billing
    getMonthlyStatementPreview,
    lockMonthlyStatement,
    unlockMonthlyStatement,

    // 5. Fleet Options (Real Vehicles & Drivers)
    getFleetOptions
} = require('../controllers/corporateController');

const { protect, adminOrExecutive, checkCompany } = require('../middleware/authMiddleware');

router.use(protect);

// Fleet options (real vehicles & drivers)
router.route('/fleet-options/:companyId')
    .get(adminOrExecutive, getFleetOptions);

// 1. CONTRACTS
router.route('/contracts/single/:id')
    .get(adminOrExecutive, getContractById)
    .put(adminOrExecutive, updateContract)
    .delete(adminOrExecutive, deleteContract);

router.route('/contracts/:id')
    .get(adminOrExecutive, (req, res, next) => {
        if (req.query.single === 'true') {
            return getContractById(req, res, next);
        }
        return getContracts(req, res, next);
    })
    .post(adminOrExecutive, createContract)
    .put(adminOrExecutive, updateContract)
    .delete(adminOrExecutive, deleteContract);

// 2. DAILY REGISTER
router.route('/register/:contractId')
    .get(adminOrExecutive, getDailyRegister);

router.route('/register/prefill/:contractId')
    .post(adminOrExecutive, prefillDailyRegister);

router.route('/register/clear/:contractId')
    .post(adminOrExecutive, clearDailyRegister);

router.route('/register/entry/:id')
    .put(adminOrExecutive, updateDailyRegisterEntry);

router.route('/register/bulk-save/:contractId')
    .post(adminOrExecutive, bulkSaveDailyRegister);

router.route('/register/month-summary/:contractId')
    .get(adminOrExecutive, getMonthRegisterSummary);

// 3. ON-CALL DUTY SLIPS
router.route('/duty-slips/single/:id')
    .get(adminOrExecutive, getDutySlipById)
    .put(adminOrExecutive, updateDutySlip)
    .delete(adminOrExecutive, deleteDutySlip);

router.route('/duty-slips/:id/approval')
    .post(adminOrExecutive, approveDutySlip);

router.route('/duty-slips/:id')
    .get(adminOrExecutive, (req, res, next) => {
        if (req.query.single === 'true') {
            return getDutySlipById(req, res, next);
        }
        return getDutySlips(req, res, next);
    })
    .post(adminOrExecutive, createDutySlip)
    .put(adminOrExecutive, updateDutySlip)
    .delete(adminOrExecutive, deleteDutySlip);

// 4. MONTHLY STATEMENTS
router.route('/statement/preview/:contractId')
    .get(adminOrExecutive, getMonthlyStatementPreview);

router.route('/statement/lock/:contractId')
    .post(adminOrExecutive, lockMonthlyStatement);

router.route('/statement/unlock/:contractId')
    .post(adminOrExecutive, unlockMonthlyStatement);

module.exports = router;
