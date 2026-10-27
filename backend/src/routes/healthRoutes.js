// ─── Health Routes ───
const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const analyticsService = require("../services/analyticsService");

const router = express.Router();

router.get("/health", async (req, res) => {
    const isMongo = mongoose.connection.readyState === 1;
    let mongoTxnCount = 0;
    if (isMongo) {
        try {
            mongoTxnCount = await Transaction.countDocuments();
        } catch (_) {}
    }

    const hasData = isMongo && mongoTxnCount > 0;
    const storageMode = isMongo ? "mongodb" : "in-memory";

    res.json({
        success: true,
        status: hasData ? "healthy" : "operational",
        storageMode,
        mongoConnected: isMongo,
        transactionCount: mongoTxnCount,
        dataAvailable: true,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
