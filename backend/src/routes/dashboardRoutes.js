// ─── Dashboard Routes ───
const express = require("express");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

// Suggested REST API endpoints
router.get("/dashboard/summary", dashboardController.getSummary);
router.get("/dashboard/sales", dashboardController.getSales);
router.get("/dashboard/top-products", dashboardController.getTopProducts);
router.get("/dashboard/recent-transactions", dashboardController.getRecentTransactions);

// Preserved application routes
router.get("/merchant", dashboardController.getSummary);
router.get("/business-health", dashboardController.getBusinessHealth);
router.get("/hourly-analysis", dashboardController.getHourlyAnalysis);
router.get("/trigger-check", dashboardController.getTriggerCheck);
router.get("/opportunity", dashboardController.getOpportunity);
router.get("/merchants", dashboardController.getMerchants);
router.post("/seed-merchant", dashboardController.seedMerchant);

module.exports = router;
