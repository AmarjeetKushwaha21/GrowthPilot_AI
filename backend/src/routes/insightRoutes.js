// ─── Insight & AI Routes ───
const express = require("express");
const insightController = require("../controllers/insightController");

const router = express.Router();

router.get("/insights", insightController.getInsights);
router.post("/insights/generate", insightController.generateInsight);
router.get("/ai-business-analysis", insightController.getAiBusinessAnalysis);
router.get("/ai-growth-recommendation", insightController.getAiGrowthRecommendation);
router.get("/ai-test", insightController.testAi);
router.post("/agent/cycle", insightController.runAgentCycle);

module.exports = router;
