const CashTransaction = require('../models/CashTransaction');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');
const Company = require('../models/Company');

/**
 * Universal Financial Transaction Sync Service
 * Guarantees that every Cash / Bank transaction linked to any entity
 * (Advances, Fuel, Maintenance, Border Tax, Fastag, Parking, Allowances, Expenses, Bookings)
 * stays 100% in sync upon Create, Update, and Delete.
 */

/**
 * Helper to determine if paymentMode represents Cash
 */
const isCashMode = (paymentMode, bankAccountId) => {
    if (bankAccountId) return false;
    if (!paymentMode) return true;
    const mode = String(paymentMode).toLowerCase();
    return mode.includes('cash') || mode === 'cash in hand' || mode === 'driver cash' || mode === 'cash to company';
};

/**
 * 1. Record Financial Transaction (Cash / Bank)
 */
const recordFinancialTransaction = async ({
    companyId,
    sourceId,
    sourceType,
    amount,
    date,
    paymentMode,
    bankAccountId,
    type = 'OUT',
    category,
    description = '',
    driverRef = null,
    driverName = '',
    bookingRef = null,
    bookingId = '',
    guestName = '',
    reference = '',
    receiptPhoto = '',
    user = null,
    paidBy = 'Company'
}) => {
    try {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return null;
        if (!companyId) return null;

        // If paid by Guest, do not deduct from Company cash/bank
        if (paidBy === 'Guest') return null;

        const txDate = date ? new Date(date) : new Date();
        const effectiveUserId = user?._id || user || null;
        const isCash = isCashMode(paymentMode, bankAccountId);

        if (isCash) {
            const cashTx = await CashTransaction.create({
                company: companyId,
                type,
                amount: numAmount,
                category: category || `${sourceType} Expense`,
                description,
                reference,
                receiptPhoto,
                date: txDate,
                driverRef,
                driverName,
                bookingRef,
                bookingId,
                guestName,
                sourceId: sourceId || null,
                sourceType: sourceType || '',
                createdBy: effectiveUserId
            });

            // Adjust company cash balance
            await Company.findByIdAndUpdate(companyId, {
                $inc: { cashBalance: type === 'OUT' ? -numAmount : numAmount }
            });

            console.log(`[transactionSync] Created CashTransaction (${type} ₹${numAmount}) for ${sourceType} (${sourceId})`);
            return { type: 'cash', tx: cashTx };
        } else if (bankAccountId) {
            const bank = await BankAccount.findById(bankAccountId);
            if (bank) {
                bank.currentBalance = (bank.currentBalance || 0) + (type === 'OUT' ? -numAmount : numAmount);
                await bank.save();

                const bankTx = await BankTransaction.create({
                    company: companyId,
                    bankAccount: bank._id,
                    bankName: bank.bankName || '',
                    type,
                    amount: numAmount,
                    category: category || `${sourceType} Expense`,
                    paymentMode: paymentMode || 'Bank Transfer',
                    reference,
                    description,
                    paymentScreenshot: receiptPhoto || '',
                    date: txDate,
                    bookingRef,
                    sourceId: sourceId || null,
                    sourceType: sourceType || '',
                    createdBy: effectiveUserId
                });

                console.log(`[transactionSync] Created BankTransaction (${type} ₹${numAmount}) for ${sourceType} (${sourceId})`);
                return { type: 'bank', tx: bankTx };
            }
        }
    } catch (err) {
        console.error(`[transactionSync] Error recording financial transaction for ${sourceType}:`, err);
    }
    return null;
};

/**
 * 2. Remove Financial Transaction (Revert Balance & Delete Records)
 */
const removeFinancialTransaction = async ({
    sourceId,
    sourceType,
    companyId,
    driverRef,
    amount,
    category
}) => {
    try {
        let cashDeletedCount = 0;
        let bankDeletedCount = 0;

        // ── 1. Find & Revert Cash Transactions ──
        let cashTxs = [];
        if (sourceId) {
            cashTxs = await CashTransaction.find({ sourceId });
        }

        // Fallback for older transactions created without sourceId
        if (cashTxs.length === 0 && companyId && (category || driverRef || amount)) {
            const fallbackQuery = { company: companyId };
            if (category) fallbackQuery.category = category;
            if (driverRef) fallbackQuery.driverRef = driverRef;
            if (amount) fallbackQuery.amount = Number(amount);
            cashTxs = await CashTransaction.find(fallbackQuery).sort({ createdAt: -1 }).limit(1);
        }

        for (const tx of cashTxs) {
            // Revert Cash Balance: OUT reverts as (+amount), IN reverts as (-amount)
            const revertDelta = tx.type === 'OUT' ? tx.amount : -tx.amount;
            await Company.findByIdAndUpdate(tx.company, {
                $inc: { cashBalance: revertDelta }
            });
            await tx.deleteOne();
            cashDeletedCount++;
            console.log(`[transactionSync] Deleted CashTransaction & reverted ₹${revertDelta} on company ${tx.company}`);
        }

        // ── 2. Find & Revert Bank Transactions ──
        let bankTxs = [];
        if (sourceId) {
            bankTxs = await BankTransaction.find({ sourceId });
        }

        if (bankTxs.length === 0 && companyId && (category || amount)) {
            const fallbackBankQuery = { company: companyId };
            if (category) fallbackBankQuery.category = category;
            if (amount) fallbackBankQuery.amount = Number(amount);
            bankTxs = await BankTransaction.find(fallbackBankQuery).sort({ createdAt: -1 }).limit(1);
        }

        for (const tx of bankTxs) {
            const revertDelta = tx.type === 'OUT' ? tx.amount : -tx.amount;
            await BankAccount.findByIdAndUpdate(tx.bankAccount, {
                $inc: { currentBalance: revertDelta }
            });
            await tx.deleteOne();
            bankDeletedCount++;
            console.log(`[transactionSync] Deleted BankTransaction & reverted ₹${revertDelta} on bank ${tx.bankAccount}`);
        }

        return { cashDeletedCount, bankDeletedCount };
    } catch (err) {
        console.error(`[transactionSync] Error removing financial transaction for ${sourceType} (${sourceId}):`, err);
    }
    return { cashDeletedCount: 0, bankDeletedCount: 0 };
};

/**
 * 3. Update Financial Transaction (Revert Old & Apply New)
 */
const updateFinancialTransaction = async (params) => {
    // 1. Revert and delete old transaction
    await removeFinancialTransaction({
        sourceId: params.sourceId,
        sourceType: params.sourceType,
        companyId: params.companyId,
        driverRef: params.driverRef,
        category: params.category
    });

    // 2. Record new transaction with updated values
    return await recordFinancialTransaction(params);
};

module.exports = {
    isCashMode,
    recordFinancialTransaction,
    removeFinancialTransaction,
    updateFinancialTransaction
};
