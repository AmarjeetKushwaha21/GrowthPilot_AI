// ─── Campaign History and Feedback Loop Service ───
const Campaign = require("../models/Campaign");

// In-memory fallback cache for environments where MongoDB is running offline or disconnected
const inMemoryCampaigns = [];

function getCleanMerchantCode(name) {
    return String(name || "MERCHANT")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase() || "MERCHANT";
}

// Seed default benchmark campaigns so merchants immediately see historical learnings
const seedDefaultCampaigns = (merchantName) => {
    const code = getCleanMerchantCode(merchantName);
    return [
        {
            campaign_id: `CMP-${code}-001`,
            merchant_name: merchantName,
            campaign_type: "Happy Hour Combo",
            title: "Evening Refreshment Combo",
            description: "Targeted 15% discount on snack and beverage combos during 18:00–19:00 lull.",
            target_window: "18:00 - 19:00",
            discount: 15,
            category: "Beverage",
            recommendation_reason: "Sales during 18:00–19:00 had dropped 42% below historical average.",
            supporting_evidence: {
                current_window_sales: 180,
                baseline_sales: 420,
                drop_percentage: 57.1,
                historical_campaign_reference: "Initial benchmark campaign"
            },
            status: "completed",
            execution_type: "simulated",
            baseline_metrics: {
                sales: 5200,
                transactions: 28,
                window_sales: 180,
                baseline_hourly: 420
            },
            outcome_metrics: {
                simulated: true,
                projected_sales: 5824,
                actual_sales: 5824,
                uplift_percent: 12.0,
                additional_revenue: 624
            },
            merchant_feedback: {
                rating: 5,
                notes: "Great response during the evening hours. Footfall noticeably increased.",
                feedback_date: new Date(Date.now() - 3 * 86400000)
            },
            created_at: new Date(Date.now() - 4 * 86400000),
            updated_at: new Date(Date.now() - 3 * 86400000)
        },
        {
            campaign_id: `CMP-${code}-002`,
            merchant_name: merchantName,
            campaign_type: "Time-Limited Flash Sale",
            title: "Afternoon Snack Special",
            description: "10% time-limited discount on quick bites between 15:00–16:00.",
            target_window: "15:00 - 16:00",
            discount: 10,
            category: "Snacks",
            recommendation_reason: "Historical trend indicated steady but under-monetized afternoon foot traffic.",
            supporting_evidence: {
                current_window_sales: 310,
                baseline_sales: 390,
                drop_percentage: 20.5,
                historical_campaign_reference: "Post-lunch lull optimization"
            },
            status: "completed",
            execution_type: "simulated",
            baseline_metrics: {
                sales: 4800,
                transactions: 22,
                window_sales: 310,
                baseline_hourly: 390
            },
            outcome_metrics: {
                simulated: true,
                projected_sales: 5184,
                actual_sales: 5184,
                uplift_percent: 8.0,
                additional_revenue: 384
            },
            merchant_feedback: {
                rating: 4,
                notes: "Decent boost in transactions, good for clearing mid-day stock.",
                feedback_date: new Date(Date.now() - 1 * 86400000)
            },
            created_at: new Date(Date.now() - 2 * 86400000),
            updated_at: new Date(Date.now() - 1 * 86400000)
        }
    ];
};

/**
 * Retrieves all campaigns for a specific merchant.
 */
async function getCampaigns(merchantName, isMongoConnected = true) {
    if (isMongoConnected) {
        try {
            let campaigns = await Campaign.find({ merchant_name: merchantName }).sort({ created_at: -1 });
            if (campaigns.length === 0) {
                const defaults = seedDefaultCampaigns(merchantName);
                await Campaign.insertMany(defaults);
                campaigns = await Campaign.find({ merchant_name: merchantName }).sort({ created_at: -1 });
            }
            return campaigns;
        } catch (err) {
            console.log("Mongo getCampaigns error, falling back to memory:", err.message);
        }
    }

    // Fallback: in-memory
    let mem = inMemoryCampaigns.filter(c => c.merchant_name === merchantName);
    if (mem.length === 0) {
        const defaults = seedDefaultCampaigns(merchantName);
        defaults.forEach(d => inMemoryCampaigns.push(d));
        mem = inMemoryCampaigns.filter(c => c.merchant_name === merchantName);
    }
    return mem.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Creates or registers a campaign.
 */
async function saveCampaign(campaignData, isMongoConnected = true) {
    campaignData.updated_at = new Date();
    if (!campaignData.campaign_id) {
        campaignData.campaign_id = `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    if (isMongoConnected) {
        try {
            const campaign = new Campaign(campaignData);
            return await campaign.save();
        } catch (err) {
            console.log("Mongo saveCampaign error, falling back to memory:", err.message);
        }
    }

    // In-memory fallback
    const existingIdx = inMemoryCampaigns.findIndex(c => c.campaign_id === campaignData.campaign_id);
    if (existingIdx >= 0) {
        inMemoryCampaigns[existingIdx] = { ...inMemoryCampaigns[existingIdx], ...campaignData };
        return inMemoryCampaigns[existingIdx];
    } else {
        inMemoryCampaigns.unshift(campaignData);
        return campaignData;
    }
}

/**
 * Updates campaign status and computes simulated outcomes upon approval/activation.
 */
async function updateCampaignStatus(campaignId, status, isMongoConnected = true) {
    const validStatuses = ["recommended", "approved", "rejected", "active", "completed"];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }

    const updates = { status, updated_at: new Date() };

    // If activated or completed, simulate outcomes deterministically based on discount & baseline
    if (status === "active" || status === "completed" || status === "approved") {
        updates.execution_type = "simulated";
    }

    if (isMongoConnected) {
        try {
            const campaign = await Campaign.findOne({ campaign_id: campaignId });
            if (campaign) {
                // If moving to active/completed and uplift not calculated yet
                if ((status === "active" || status === "completed") && (!campaign.outcome_metrics || campaign.outcome_metrics.uplift_percent === 0)) {
                    const discount = campaign.discount || 10;
                    // Deterministic simulation formula: uplift between 8% and 16% tied to discount
                    const calculatedUplift = Math.round((8 + (discount * 0.4)) * 10) / 10;
                    const baselineSales = campaign.baseline_metrics?.sales || 5000;
                    const projectedSales = Math.round(baselineSales * (1 + calculatedUplift / 100));
                    updates.outcome_metrics = {
                        simulated: true,
                        projected_sales: projectedSales,
                        actual_sales: projectedSales,
                        uplift_percent: calculatedUplift,
                        additional_revenue: projectedSales - baselineSales
                    };
                }
                const updated = await Campaign.findOneAndUpdate(
                    { campaign_id: campaignId },
                    { $set: updates },
                    { new: true }
                );
                return updated;
            }
        } catch (err) {
            console.log("Mongo updateCampaignStatus error, falling back to memory:", err.message);
        }
    }

    // In-memory fallback
    const item = inMemoryCampaigns.find(c => c.campaign_id === campaignId);
    if (!item) {
        throw new Error("Campaign not found");
    }
    item.status = status;
    item.updated_at = new Date();
    if ((status === "active" || status === "completed") && (!item.outcome_metrics || item.outcome_metrics.uplift_percent === 0)) {
        const discount = item.discount || 10;
        const calculatedUplift = Math.round((8 + (discount * 0.4)) * 10) / 10;
        const baselineSales = item.baseline_metrics?.sales || 5000;
        const projectedSales = Math.round(baselineSales * (1 + calculatedUplift / 100));
        item.outcome_metrics = {
            simulated: true,
            projected_sales: projectedSales,
            actual_sales: projectedSales,
            uplift_percent: calculatedUplift,
            additional_revenue: projectedSales - baselineSales
        };
    }
    return item;
}

/**
 * Records merchant feedback for a campaign.
 */
async function recordMerchantFeedback(campaignId, rating, notes, isMongoConnected = true) {
    const feedback = {
        rating: Math.min(Math.max(Number(rating) || 5, 1), 5),
        notes: String(notes || "").trim(),
        feedback_date: new Date()
    };

    if (isMongoConnected) {
        try {
            const updated = await Campaign.findOneAndUpdate(
                { campaign_id: campaignId },
                { $set: { merchant_feedback: feedback, updated_at: new Date() } },
                { new: true }
            );
            if (updated) return updated;
        } catch (err) {
            console.log("Mongo recordMerchantFeedback error, falling back to memory:", err.message);
        }
    }

    // In-memory fallback
    const item = inMemoryCampaigns.find(c => c.campaign_id === campaignId || c.campaign_id.toUpperCase() === String(campaignId).toUpperCase());
    if (!item) {
        throw new Error(`Campaign not found: ${campaignId}`);
    }
    item.merchant_feedback = feedback;
    item.updated_at = new Date();
    return item;
}

/**
 * Builds structured context of past campaigns for the Sarvam AI prompt.
 * Supplies empirical historical outcomes to guide future recommendations.
 */
async function buildHistoricalFeedbackSummary(merchantName, isMongoConnected = true) {
    const campaigns = await getCampaigns(merchantName, isMongoConnected);
    const completedCampaigns = campaigns.filter(c => c.status === "completed" || (c.outcome_metrics && c.outcome_metrics.uplift_percent > 0));

    if (completedCampaigns.length === 0) {
        return {
            hasHistory: false,
            summaryText: "No prior campaign outcomes recorded yet for this merchant.",
            campaigns: []
        };
    }

    const pastRecords = completedCampaigns.slice(0, 3).map(c => {
        const uplift = c.outcome_metrics?.uplift_percent || 0;
        const feedback = c.merchant_feedback?.rating ? `${c.merchant_feedback.rating}/5 stars` : "No rating yet";
        return `- Campaign "${c.title}" (${c.campaign_type || "Discount"} ${c.discount}% on ${c.category || "General"}): Recorded +${uplift}% sales uplift (${c.outcome_metrics?.simulated ? "Simulated" : "Actual"}), Merchant Rating: ${feedback}. Notes: "${c.merchant_feedback?.notes || "N/A"}"`;
    });

    const summaryText = pastRecords.join("\n");

    return {
        hasHistory: true,
        summaryText,
        campaigns: completedCampaigns
    };
}

module.exports = {
    getCampaigns,
    saveCampaign,
    updateCampaignStatus,
    recordMerchantFeedback,
    buildHistoricalFeedbackSummary
};
