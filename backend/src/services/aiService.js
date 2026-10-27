// ─── Sarvam AI Integration & Intelligent Analysis Service ───
const { config } = require("../config/env");
const Insight = require("../models/Insight");
const Recommendation = require("../models/Recommendation");

let sarvam = null;
try {
    const key = config.SARVAM_API_KEY;
    if (key && key !== "your_sarvam_api_key_here" && key !== "dummy_key" && !key.includes("<")) {
        const { SarvamAIClient } = require("sarvamai");
        sarvam = new SarvamAIClient({
            apiSubscriptionKey: key
        });
    }
} catch (e) {
    console.warn("[Sarvam AI] Client initialization notice:", e.message);
}

/**
 * Generates an executive AI summary for the merchant and persists it to MongoDB.
 */
async function generateBusinessAnalysis(merchantName, businessData) {
    const { totalSales, daytimeSales, eveningSales, daytimeTransactions, eveningTransactions } = businessData;
    let aiText = "";

    if (sarvam && config.SARVAM_API_KEY) {
        try {
            const prompt = `
You are an AI business partner for ${merchantName}, a local retail/food business.

Analyze this simulated transaction data:
- Merchant: ${merchantName}
- Total Sales: ₹${totalSales}
- Daytime Sales (before 6 PM): ₹${daytimeSales} (${daytimeTransactions} txns)
- Evening Sales (after 6 PM): ₹${eveningSales} (${eveningTransactions} txns)

Provide a concise, professional 2-sentence executive summary identifying the key business pattern and strategic growth opportunity. Be direct, authoritative, and actionable.
`;
            const response = await sarvam.chat.completions({
                model: "sarvam-105b",
                messages: [{ role: "user", content: prompt }]
            });
            aiText = response?.choices?.[0]?.message?.content || "";
        } catch (err) {
            console.warn("[Sarvam AI Business Analysis Call Notice]:", err.message);
        }
    }

    if (!aiText) {
        aiText = `${merchantName} demonstrates consistent transaction volume during daytime hours (₹${daytimeSales.toLocaleString("en-IN")}), but experiences a sharp drop in evening revenue (₹${eveningSales.toLocaleString("en-IN")}). The primary growth opportunity lies in activating post-6 PM customer demand with targeted evening combo offers.`;
    }

    // Persist insight to MongoDB
    try {
        const insightId = `INS-${merchantName.replace(/\s+/g, "").toUpperCase()}-${Date.now()}`;
        await Insight.create({
            insightId,
            merchant_name: merchantName,
            type: "sales_drop",
            title: `Revenue Distribution Analysis for ${merchantName}`,
            description: aiText,
            supportingMetrics: { totalSales, daytimeSales, eveningSales, daytimeTransactions, eveningTransactions },
            source: sarvam ? "sarvam_ai" : "heuristic"
        });
    } catch (_) {}

    return aiText;
}

/**
 * Generates 3 contextual growth recommendations based on opportunity and past feedback.
 */
async function generateGrowthRecommendations(merchantName, opportunity, categories, feedbackSummary) {
    let recommendations = [];

    if (sarvam && config.SARVAM_API_KEY) {
        const prompt = `
You are GrowthPilot AI, an AI growth partner for ${merchantName}.

A business opportunity has been detected:
- Merchant: ${merchantName}
- Main categories sold: ${categories.join(", ")}
- Low activity window: ${opportunity.hour}:00 - ${opportunity.hour + 1}:00
- Current sales in window: ₹${opportunity.currentValue}
- Historical baseline: ₹${opportunity.baseline}
- Sales drop: ${Math.abs(opportunity.deviation)}% below baseline

HISTORICAL CAMPAIGN OUTCOMES FOR THIS MERCHANT:
${feedbackSummary.summaryText}
(Note: Treat historical outcomes as empirical evidence to guide realistic recommendations, not as future guarantees.)

Generate EXACTLY 3 distinct, practical, actionable growth recommendations tailored specifically to ${merchantName}'s business context to boost sales during this window.

Return ONLY a raw JSON array of 3 objects with NO markdown formatting or commentary:
[
  {
    "action": "Short Title 1",
    "description": "Short 1-sentence explanation of what to do.",
    "discount": 10
  },
  {
    "action": "Short Title 2",
    "description": "Short 1-sentence explanation of what to do.",
    "discount": 15
  },
  {
    "action": "Short Title 3",
    "description": "Short 1-sentence explanation of what to do.",
    "discount": 5
  }
]

Rules:
- Generate 3 distinct actions tailored to ${merchantName}.
- Each discount must be a number between 5 and 20.
- Return ONLY valid JSON array of 3 recommendation objects.
`;
        try {
            const response = await sarvam.chat.completions({
                model: "sarvam-105b",
                messages: [{ role: "user", content: prompt }]
            });

            const rawContent = response?.choices?.[0]?.message?.content || "";
            if (rawContent) {
                const clean = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
                const parsed = JSON.parse(clean);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    recommendations = parsed;
                }
            }
        } catch (e) {
            console.warn("[Sarvam AI Recommendation Call Notice]:", e.message);
        }
    }

    if (!Array.isArray(recommendations) || recommendations.length < 3) {
        const cat1 = categories[0] || "Featured";
        const cat2 = categories[1] || "Popular";
        const cat3 = categories[2] || "Special";

        recommendations = [
            {
                action: `${cat1} Combo Offer`,
                description: `Offer a targeted ${cat1.toLowerCase()} combo during the ${opportunity.hour}:00–${opportunity.hour + 1}:00 low-activity period.`,
                discount: 15
            },
            {
                action: `Time-Limited ${cat2} Discount`,
                description: `Run a time-limited discount on ${cat2.toLowerCase()} items during the low-activity window.`,
                discount: 10
            },
            {
                action: `${cat3} Product Promotion`,
                description: `Promote high-demand ${cat3.toLowerCase()} items to increase footfall during quiet hours.`,
                discount: 5
            }
        ];
    }

    // Persist recommendations
    try {
        for (let i = 0; i < recommendations.length; i++) {
            const rec = recommendations[i];
            const recId = `REC-${merchantName.replace(/\s+/g, "").toUpperCase()}-${opportunity.hour}-${i + 1}`;
            await Recommendation.updateOne(
                { recommendationId: recId },
                {
                    $set: {
                        recommendationId: recId,
                        merchant_name: merchantName,
                        action: rec.action,
                        description: rec.description,
                        discount: rec.discount || 10,
                        targetWindow: `${String(opportunity.hour).padStart(2, "0")}:00 - ${String((opportunity.hour + 1) % 24).padStart(2, "0")}:00`,
                        category: categories[i % categories.length] || "General",
                        supportingEvidence: {
                            currentValue: opportunity.currentValue,
                            baseline: opportunity.baseline,
                            deviation: opportunity.deviation
                        },
                        status: "recommended"
                    }
                },
                { upsert: true }
            );
        }
    } catch (_) {}

    return recommendations;
}

/**
 * Checks AI service status.
 */
async function testAiConnection() {
    if (!config.SARVAM_API_KEY || !sarvam) {
        return {
            success: true,
            simulated: true,
            message: "Sarvam AI running in fallback demo mode (No SARVAM_API_KEY set)."
        };
    }
    const response = await sarvam.chat.completions({
        model: "sarvam-105b",
        messages: [{ role: "user", content: "Say hello in one short sentence." }]
    });
    return { success: true, simulated: false, response };
}

module.exports = {
    generateBusinessAnalysis,
    generateGrowthRecommendations,
    testAiConnection
};
