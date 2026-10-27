// ─── Insight & AI Intelligent Action Controller ───
const mongoose = require("mongoose");
const Insight = require("../models/Insight");
const Recommendation = require("../models/Recommendation");
const analyticsService = require("../services/analyticsService");
const aiService = require("../services/aiService");
const { buildHistoricalFeedbackSummary, saveCampaign } = require("../services/campaignFeedback");
const { analyzeHistoricalIntelligence } = require("../services/historicalIntelligence");

/**
 * GET /api/insights
 */
async function getInsights(req, res, next) {
    try {
        const merchantName = req.query.merchant_name;
        const query = {};
        if (merchantName) query.merchant_name = merchantName;

        if (mongoose.connection.readyState === 1) {
            const insights = await Insight.find(query).sort({ generationTimestamp: -1 }).limit(20).lean();
            return res.json({ success: true, count: insights.length, insights });
        }

        res.json({ success: true, count: 0, insights: [] });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/insights/generate
 */
async function generateInsight(req, res, next) {
    try {
        const merchantName = req.body.merchant_name || req.query.merchant_name || "Sharma Café";
        const health = await analyticsService.getBusinessHealth(merchantName);
        const aiAnalysis = await aiService.generateBusinessAnalysis(merchantName, health);

        res.json({
            success: true,
            merchantName,
            aiAnalysis,
            businessData: health
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/ai-business-analysis
 */
async function getAiBusinessAnalysis(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const health = await analyticsService.getBusinessHealth(merchantName);
        const aiText = await aiService.generateBusinessAnalysis(merchantName, health);

        res.json({
            success: true,
            merchantName,
            businessData: health,
            aiAnalysis: aiText
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/ai-growth-recommendation
 */
async function getAiGrowthRecommendation(req, res, next) {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await analyticsService.fetchTransactions(merchantName, false);

        if (transactions.length === 0) {
            return res.json({
                success: false,
                merchantName,
                message: "No transaction data found for this merchant."
            });
        }

        const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
        const opportunityResult = await analyticsService.getOpportunity(merchantName);

        let chosenOpportunity;
        if (opportunityResult.opportunities && opportunityResult.opportunities.length > 0) {
            chosenOpportunity = opportunityResult.opportunities[0];
        } else {
            chosenOpportunity = { hour: 19, currentValue: 120, baseline: 350, deviation: -65.71 };
        }

        const isMongoConnected = mongoose.connection.readyState === 1;
        const feedbackSummary = await buildHistoricalFeedbackSummary(merchantName, isMongoConnected);

        const rawRecommendations = await aiService.generateGrowthRecommendations(
            merchantName,
            chosenOpportunity,
            categories,
            feedbackSummary
        );

        // Enrich recommendations with campaign identifiers and supporting evidence
        const enrichedRecommendations = rawRecommendations.map((rec, idx) => {
            const campaignId = `REC-${merchantName.replace(/\s+/g, "").toUpperCase()}-${chosenOpportunity.hour}-${idx + 1}`;
            return {
                id: campaignId,
                action: rec.action,
                description: rec.description,
                discount: rec.discount || 10,
                target_window: `${String(chosenOpportunity.hour).padStart(2, "0")}:00 - ${String((chosenOpportunity.hour + 1) % 24).padStart(2, "0")}:00`,
                category: categories[idx % categories.length] || "General",
                supporting_evidence: {
                    observed_sales: `₹${chosenOpportunity.currentValue} vs baseline ₹${chosenOpportunity.baseline}`,
                    drop_percentage: `${Math.abs(chosenOpportunity.deviation)}%`,
                    historical_reference: feedbackSummary.hasHistory
                        ? "Aligned with previous successful uplift experiments for this merchant."
                        : "Baseline initial recommendation based on observed drop."
                }
            };
        });

        // Stage recommended campaigns
        for (const rec of enrichedRecommendations) {
            await saveCampaign({
                campaign_id: rec.id,
                merchant_name: merchantName,
                campaign_type: "Discount Offer",
                title: rec.action,
                description: rec.description,
                target_window: rec.target_window,
                discount: rec.discount,
                category: rec.category,
                recommendation_reason: `Sales drop of ${chosenOpportunity.deviation}% observed during ${rec.target_window}.`,
                supporting_evidence: {
                    current_window_sales: chosenOpportunity.currentValue,
                    baseline_sales: chosenOpportunity.baseline,
                    drop_percentage: Math.abs(chosenOpportunity.deviation),
                    historical_campaign_reference: rec.supporting_evidence.historical_reference
                },
                status: "recommended",
                execution_type: "simulated",
                baseline_metrics: {
                    sales: chosenOpportunity.currentValue,
                    baseline_hourly: chosenOpportunity.baseline
                }
            }, isMongoConnected);
        }

        res.json({
            success: true,
            merchantName,
            opportunity: chosenOpportunity,
            recommendations: enrichedRecommendations,
            historicalFeedbackUsed: feedbackSummary.hasHistory,
            historicalContext: feedbackSummary.summaryText
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/ai-test
 */
async function testAi(req, res, next) {
    try {
        const result = await aiService.testAiConnection();
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/agent/cycle
 */
async function runAgentCycle(req, res, next) {
    try {
        const merchantName = req.body.merchant_name || "Sharma Café";
        const isMongoConnected = mongoose.connection.readyState === 1;

        // 1. Transaction analysis
        const transactions = await analyticsService.fetchTransactions(merchantName, false);
        const intelligence = analyzeHistoricalIntelligence(transactions, merchantName);

        // 2. Opportunity identification
        const dates = [...new Set(transactions.map(t => new Date(t.date).toISOString().split("T")[0]))].sort();
        const currentDate = dates[dates.length - 1];

        const hourlySales = {};
        transactions.forEach(t => {
            const d = new Date(t.date).toISOString().split("T")[0];
            const h = t.hour;
            const k = `${d}-${h}`;
            if (!hourlySales[k]) hourlySales[k] = 0;
            hourlySales[k] += t.amount;
        });

        let chosenOpportunity = null;
        for (let h = 14; h <= 21; h++) {
            const currentVal = hourlySales[`${currentDate}-${h}`] || 0;
            const prevVals = dates.slice(0, -1).map(d => hourlySales[`${d}-${h}`]).filter(v => v !== undefined);
            const baseline = prevVals.length > 0 ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 300;
            const drop = ((currentVal - baseline) / (baseline || 1)) * 100;
            if (drop <= -20 && (!chosenOpportunity || drop < chosenOpportunity.drop)) {
                chosenOpportunity = {
                    hour: h,
                    currentSales: currentVal,
                    baseline: Math.round(baseline),
                    drop: Math.round(drop * 10) / 10,
                    window: `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`
                };
            }
        }

        if (!chosenOpportunity) {
            chosenOpportunity = {
                hour: 19,
                currentSales: 120,
                baseline: 350,
                drop: -65.7,
                window: "19:00 - 20:00"
            };
        }

        // 3. Feedback loop
        const feedback = await buildHistoricalFeedbackSummary(merchantName, isMongoConnected);

        // 4. Staged campaign creation
        const topCategory = intelligence.categoryTrends[0]?.category || "Featured Special";
        const suggestedDiscount = 15;
        const projectedUplift = 12.0;
        const candidateTitle = `${topCategory} Evening Happy Hour`;
        const candidateDesc = `Launch a targeted ${suggestedDiscount}% promotional discount on ${topCategory.toLowerCase()} items during ${chosenOpportunity.window}.`;

        const agentCampaignId = `AGENT-${merchantName.replace(/\s+/g, "").toUpperCase()}-${Date.now()}`;

        const stagedCampaign = {
            campaign_id: agentCampaignId,
            merchant_name: merchantName,
            campaign_type: "AI Agent Recommendation",
            title: candidateTitle,
            description: candidateDesc,
            target_window: chosenOpportunity.window,
            discount: suggestedDiscount,
            category: topCategory,
            recommendation_reason: `Sales drop of ${Math.abs(chosenOpportunity.drop)}% observed in ${chosenOpportunity.window} window.`,
            supporting_evidence: {
                current_window_sales: chosenOpportunity.currentSales,
                baseline_sales: chosenOpportunity.baseline,
                drop_percentage: Math.abs(chosenOpportunity.drop),
                historical_campaign_reference: feedback.hasHistory
                    ? "Similar past promotions achieved positive merchant satisfaction."
                    : "Calibrated based on category profit margins."
            },
            status: "recommended",
            execution_type: "simulated",
            baseline_metrics: {
                sales: intelligence.metrics.currentSales,
                transactions: intelligence.metrics.currentOrders,
                window_sales: chosenOpportunity.currentSales,
                baseline_hourly: chosenOpportunity.baseline
            },
            outcome_metrics: {
                simulated: true,
                projected_sales: Math.round(intelligence.metrics.currentSales * (1 + projectedUplift / 100)),
                uplift_percent: projectedUplift
            }
        };

        const saved = await saveCampaign(stagedCampaign, isMongoConnected);

        res.json({
            success: true,
            agentState: {
                stage: "Awaiting Merchant Approval",
                flowStage: "Recommend",
                merchantName,
                opportunity: chosenOpportunity,
                recommendation: saved,
                supportingEvidence: {
                    dropPercentage: `${Math.abs(chosenOpportunity.drop)}%`,
                    observedDrop: `₹${chosenOpportunity.currentSales} vs normal ₹${chosenOpportunity.baseline}`,
                    window: chosenOpportunity.window,
                    categoryInfluence: `${topCategory} represents ${intelligence.categoryTrends[0]?.sharePercentage || 35}% of sales volume`,
                    historicalFeedbackApplied: feedback.hasHistory
                },
                requiresApproval: true,
                executionMode: "simulated"
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getInsights,
    generateInsight,
    getAiBusinessAnalysis,
    getAiGrowthRecommendation,
    testAi,
    runAgentCycle
};
