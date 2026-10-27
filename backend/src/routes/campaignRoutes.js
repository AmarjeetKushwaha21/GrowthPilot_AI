// ─── Campaign & Action Routes ───
const express = require("express");
const campaignController = require("../controllers/campaignController");

const router = express.Router();

router.get("/campaigns", campaignController.getCampaigns);
router.post("/campaigns", campaignController.createCampaign);
router.patch("/campaigns/:id/status", campaignController.updateCampaignStatus);
router.post("/campaigns/:id/feedback", campaignController.recordFeedback);
router.get("/status", campaignController.getStatus);
router.post("/action", campaignController.activateAction);
router.get("/campaign-result", campaignController.getCampaignResult);
router.get("/historical-intelligence", campaignController.getHistoricalIntelligence);

module.exports = router;
