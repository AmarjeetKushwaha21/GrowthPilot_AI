// ─── Transaction Controller (CRUD & CSV Import) ───
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { importTransactionsHelper } = require("../scripts/importTransactions");
const analyticsService = require("../services/analyticsService");

/**
 * GET /api/transactions
 * Paginated and filtered retrieval of transactions.
 */
async function getTransactions(req, res, next) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const query = {};
        if (req.query.merchant_name) query.merchant_name = req.query.merchant_name;
        if (req.query.category) query.category = req.query.category;
        if (req.query.payment_status) query.payment_status = req.query.payment_status.toUpperCase();

        if (mongoose.connection.readyState === 1) {
            const [total, transactions] = await Promise.all([
                Transaction.countDocuments(query),
                Transaction.find(query)
                    .sort({ date: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
            ]);

            return res.json({
                success: true,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
                transactions
            });
        }

        // Memory fallback
        const memoryList = await analyticsService.fetchTransactions(req.query.merchant_name || "Sharma Café", false);
        const filtered = memoryList.filter(t => {
            if (query.category && t.category !== query.category) return false;
            if (query.payment_status && t.payment_status !== query.payment_status) return false;
            return true;
        });
        const paginated = filtered.slice(skip, skip + limit);

        res.json({
            success: true,
            page,
            limit,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / limit) || 1,
            transactions: paginated
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/transactions/:id
 */
async function getTransactionById(req, res, next) {
    try {
        const id = req.params.id;
        let txn = null;

        if (mongoose.connection.readyState === 1) {
            if (mongoose.Types.ObjectId.isValid(id)) {
                txn = await Transaction.findById(id).lean();
            }
            if (!txn) {
                txn = await Transaction.findOne({ transaction_id: id }).lean();
            }
        }

        if (!txn) {
            return res.status(404).json({
                success: false,
                message: `Transaction not found with ID: ${id}`
            });
        }

        res.json({ success: true, transaction: txn });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/transactions
 */
async function createTransaction(req, res, next) {
    try {
        const body = req.body;
        if (!body.merchant_name) {
            return res.status(400).json({ success: false, message: "merchant_name is required" });
        }
        if (body.amount === undefined || isNaN(Number(body.amount))) {
            return res.status(400).json({ success: false, message: "Valid amount is required" });
        }

        const dateObj = body.date ? new Date(body.date) : new Date();
        const transactionId = body.transaction_id || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newDoc = {
            transaction_id: transactionId,
            merchant_name: body.merchant_name,
            amount: Number(body.amount),
            date: dateObj,
            hour: body.hour !== undefined ? Number(body.hour) : dateObj.getHours(),
            minute: body.minute !== undefined ? Number(body.minute) : dateObj.getMinutes(),
            category: body.category || "General",
            payment_status: (body.payment_status || "SUCCESS").toUpperCase(),
            productId: body.productId || null,
            productName: body.productName || null,
            customerId: body.customerId || null,
            quantity: Number(body.quantity) || 1,
            unitPrice: Number(body.unitPrice) || Number(body.amount),
            paymentMethod: body.paymentMethod || "UPI",
            source: body.source || "POS"
        };

        if (mongoose.connection.readyState === 1) {
            const created = await Transaction.create(newDoc);
            return res.status(201).json({
                success: true,
                message: "Transaction created and persisted to MongoDB",
                transaction: created
            });
        }

        res.status(201).json({
            success: true,
            message: "Transaction created (in-memory mode)",
            transaction: newDoc
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/transactions/:id
 */
async function updateTransaction(req, res, next) {
    try {
        const id = req.params.id;
        const updates = req.body;

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: "Database not connected for update" });
        }

        let updated = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            updated = await Transaction.findByIdAndUpdate(id, { $set: updates }, { returnDocument: 'after' });
        }
        if (!updated) {
            updated = await Transaction.findOneAndUpdate({ transaction_id: id }, { $set: updates }, { returnDocument: 'after' });
        }

        if (!updated) {
            return res.status(404).json({ success: false, message: `Transaction not found: ${id}` });
        }

        res.json({
            success: true,
            message: "Transaction updated successfully",
            transaction: updated
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/transactions/:id
 */
async function deleteTransaction(req, res, next) {
    try {
        const id = req.params.id;

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: "Database not connected for deletion" });
        }

        let deleted = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await Transaction.findByIdAndDelete(id);
        }
        if (!deleted) {
            deleted = await Transaction.findOneAndDelete({ transaction_id: id });
        }

        if (!deleted) {
            return res.status(404).json({ success: false, message: `Transaction not found: ${id}` });
        }

        res.json({
            success: true,
            message: "Transaction deleted successfully",
            transactionId: id
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/import-transactions
 */
async function importTransactions(req, res, next) {
    try {
        const result = await importTransactionsHelper();
        const inMongo = mongoose.connection.readyState === 1;

        res.json({
            success: true,
            message: inMongo
                ? `${result.count} transaction records synchronized with MongoDB Atlas.`
                : `${result.count} transaction records loaded into memory cache (MongoDB not connected).`,
            count: result.count,
            storageMode: inMongo ? "mongodb" : "in-memory",
            details: result
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions
};
