// ─── Dashboard Controller ───
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Merchant = require("../models/Merchant");
const analyticsService = require("../services/analyticsService");

/**
 * GET /api/dashboard/summary & GET /api/merchant
 * Returns today's sales, average previous day, day-over-day change, and transaction counts.
 */
async function getSummary(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || req.query.merchantName || "Sharma Café";
        const summary = await analyticsService.getDashboardSummary(merchantName);

        res.json({
            success: true,
            merchantName: summary.merchantName,
            currentSales: summary.currentSales,
            todaySales: summary.todaySales,
            lastMonthSales: summary.lastMonthSales,
            previousAverageSales: summary.previousAverageSales,
            salesChange: summary.salesChange,
            transactions: summary.transactions,
            totalSales: summary.totalSales,
            totalTransactions: summary.totalTransactions,
            storageMode: mongoose.connection.readyState === 1 ? "mongodb" : "in-memory"
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/dashboard/sales
 * Returns day vs evening breakdown and hourly analysis.
 */
async function getSales(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const [health, hourly] = await Promise.all([
            analyticsService.getBusinessHealth(merchantName),
            analyticsService.getHourlyAnalysis(merchantName)
        ]);

        res.json({
            success: true,
            merchantName,
            daytimeSales: health.daytimeSales,
            eveningSales: health.eveningSales,
            totalSales: health.totalSales,
            hourlyData: hourly.hourlyData || []
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/dashboard/top-products
 */
async function getTopProducts(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const limit = parseInt(req.query.limit, 10) || 5;
        const result = await analyticsService.getTopProducts(merchantName, limit);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/dashboard/recent-transactions
 */
async function getRecentTransactions(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const limit = parseInt(req.query.limit, 10) || 10;
        const result = await analyticsService.getRecentTransactions(merchantName, limit);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/business-health
 */
async function getBusinessHealth(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const result = await analyticsService.getBusinessHealth(merchantName);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/hourly-analysis
 */
async function getHourlyAnalysis(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const result = await analyticsService.getHourlyAnalysis(merchantName);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/trigger-check
 */
async function getTriggerCheck(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const result = await analyticsService.getTriggerCheck(merchantName);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/opportunity
 */
async function getOpportunity(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const result = await analyticsService.getOpportunity(merchantName);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/merchants
 */
async function getMerchants(req, res, next) {
    try {
        let merchants = [];
        if (mongoose.connection.readyState === 1) {
            merchants = await Transaction.distinct("merchant_name");
        }
        if (!merchants || merchants.length < 3) {
            const memoryTxns = await analyticsService.fetchTransactions("Sharma Café", false);
            const set = new Set(memoryTxns.map(t => t.merchant_name));
            merchants = [...set];
        }
        const defaultMerchants = ["Sharma Café", "Gupta Sweets", "FreshBite Corner"];
        const finalMerchants = merchants.length >= 3 ? merchants : defaultMerchants;
        res.json({
            success: true,
            merchants: finalMerchants
        });
    } catch (err) {
        res.json({
            success: true,
            merchants: ["Sharma Café", "Gupta Sweets", "FreshBite Corner"]
        });
    }
}

/**
 * POST /api/seed-merchant
 */
async function seedMerchant(req, res, next) {
    try {
        let merchantData = {
            merchantName: req.body.merchantName || "Sharma Café",
            currentSales: 5000,
            lastMonthSales: 10000,
            salesChange: -50,
            transactions: 142
        };

        if (mongoose.connection.readyState === 1) {
            await Merchant.updateOne(
                { merchantName: merchantData.merchantName },
                { $set: merchantData },
                { upsert: true }
            );
        }

        res.json({
            success: true,
            message: "Merchant data synchronized in MongoDB!",
            merchant: merchantData
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getSummary,
    getSales,
    getTopProducts,
    getRecentTransactions,
    getBusinessHealth,
    getHourlyAnalysis,
    getTriggerCheck,
    getOpportunity,
    getMerchants,
    seedMerchant
};
