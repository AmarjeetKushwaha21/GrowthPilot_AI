// ─── Campaign & Action Controller ───
const mongoose = require("mongoose");
const {
    getCampaigns: getCampaignsService,
    saveCampaign,
    updateCampaignStatus: updateCampaignStatusService,
    recordMerchantFeedback,
    buildHistoricalFeedbackSummary
} = require("../services/campaignFeedback");
const { analyzeHistoricalIntelligence } = require("../services/historicalIntelligence");
const analyticsService = require("../services/analyticsService");

// Memory state for activated campaign compatibility
const merchantCampaigns = {};

/**
 * GET /api/campaigns
 */
async function getCampaigns(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const isMongoConnected = mongoose.connection.readyState === 1;
        const campaigns = await getCampaignsService(merchantName, isMongoConnected);

        res.json({
            success: true,
            merchantName,
            count: campaigns.length,
            campaigns
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/campaigns
 */
async function createCampaign(req, res, next) {
    try {
        const campaignData = req.body;
        if (!campaignData.merchant_name || !campaignData.title) {
            return res.status(400).json({
                success: false,
                message: "merchant_name and title are required."
            });
        }
        const isMongoConnected = mongoose.connection.readyState === 1;
        const saved = await saveCampaign(campaignData, isMongoConnected);

        res.status(201).json({
            success: true,
            campaign: saved
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/campaigns/:id/status
 */
async function updateCampaignStatus(req, res, next) {
    try {
        const campaignId = req.params.id;
        const { status, merchant_name } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        const isMongoConnected = mongoose.connection.readyState === 1;
        const updated = await updateCampaignStatusService(campaignId, status, isMongoConnected);

        if (status === "active" || status === "approved") {
            const mName = merchant_name || updated.merchant_name || "Sharma Café";
            merchantCampaigns[mName] = {
                activated: true,
                action: {
                    type: updated.title,
                    discount: updated.discount,
                    id: updated.campaign_id
                }
            };
        }

        res.json({
            success: true,
            message: `Campaign status updated to "${status}".`,
            campaign: updated
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/campaigns/:id/feedback
 */
async function recordFeedback(req, res, next) {
    try {
        const campaignId = req.params.id;
        const { rating, notes } = req.body;

        if (!rating) {
            return res.status(400).json({ success: false, message: "Rating (1-5) is required" });
        }

        const isMongoConnected = mongoose.connection.readyState === 1;
        const updated = await recordMerchantFeedback(campaignId, rating, notes, isMongoConnected);

        res.json({
            success: true,
            message: "Feedback recorded successfully. Historical feedback will inform future AI recommendations.",
            campaign: updated
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/status
 */
async function getStatus(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const merchantState = merchantCampaigns[merchantName];

        res.json({
            success: true,
            merchantName,
            campaignStatus: merchantState?.activated ? "Activated" : "Inactive",
            latestAction: merchantState?.action || null
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/action
 */
async function activateAction(req, res, next) {
    try {
        const action = req.body;
        const merchantName = action.merchant_name || action.merchantName || "Sharma Café";

        merchantCampaigns[merchantName] = {
            activated: true,
            action: action
        };

        const isMongoConnected = mongoose.connection.readyState === 1;
        const campaignId = action.id || `CMP-${Date.now()}`;
        const discount = Number(action.discount) || 10;
        const upliftPercent = Math.round((8 + (discount * 0.4)) * 10) / 10;

        await saveCampaign({
            campaign_id: campaignId,
            merchant_name: merchantName,
            campaign_type: action.type || "Growth Action",
            title: action.type || "Activated Campaign",
            description: action.description || `Growth action activated for ${merchantName}`,
            discount: discount,
            status: "active",
            execution_type: "simulated",
            outcome_metrics: {
                simulated: true,
                uplift_percent: upliftPercent
            }
        }, isMongoConnected);

        let n8nStatus = "n8n unavailable";
        try {
            const n8nResponse = await fetch("http://localhost:5678/webhook/merchant-growth-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action)
            });
            await n8nResponse.text();
            n8nStatus = "Action sent to n8n successfully";
        } catch (_) {}

        res.json({
            success: true,
            message: `Growth action "${action.type || "Campaign"}" approved and activated for ${merchantName}.`,
            merchantName,
            action,
            n8n: n8nStatus
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/campaign-result
 */
async function getCampaignResult(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const merchantState = merchantCampaigns[merchantName];

        if (!merchantState?.activated || !merchantState.action) {
            return res.json({
                success: false,
                message: "No campaign has been activated yet."
            });
        }

        const summary = await analyticsService.getDashboardSummary(merchantName);
        const simulatedUplift = 12;
        const simulatedSalesAfterCampaign = Math.round(summary.currentSales * (1 + simulatedUplift / 100));

        res.json({
            success: true,
            merchantName,
            result: {
                previousSales: summary.previousAverageSales,
                currentSales: simulatedSalesAfterCampaign,
                salesUplift: simulatedUplift,
                campaign: merchantState.action.type,
                status: "Completed",
                simulated: true
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/historical-intelligence
 */
async function getHistoricalIntelligence(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await analyticsService.fetchTransactions(merchantName, false);
        const report = analyzeHistoricalIntelligence(transactions, merchantName);

        res.json({
            success: true,
            ...report
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCampaigns,
    createCampaign,
    updateCampaignStatus,
    recordFeedback,
    getStatus,
    activateAction,
    getCampaignResult,
    getHistoricalIntelligence
};
