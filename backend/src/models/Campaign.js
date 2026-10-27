const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
    campaign_id: { type: String, required: true, unique: true },
    merchant_name: { type: String, required: true, index: true },
    campaign_type: { type: String, default: "Combo Offer" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    target_window: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    category: { type: String, default: "General" },
    recommendation_reason: { type: String, default: "" },
    supporting_evidence: {
        current_window_sales: { type: Number, default: 0 },
        baseline_sales: { type: Number, default: 0 },
        drop_percentage: { type: Number, default: 0 },
        historical_campaign_reference: { type: String, default: "" }
    },
    status: {
        type: String,
        enum: ["recommended", "approved", "rejected", "active", "completed"],
        default: "recommended"
    },
    execution_type: { type: String, default: "simulated" },
    baseline_metrics: {
        sales: { type: Number, default: 0 },
        transactions: { type: Number, default: 0 },
        window_sales: { type: Number, default: 0 },
        baseline_hourly: { type: Number, default: 0 }
    },
    outcome_metrics: {
        simulated: { type: Boolean, default: true },
        projected_sales: { type: Number, default: 0 },
        actual_sales: { type: Number, default: 0 },
        uplift_percent: { type: Number, default: 0 },
        additional_revenue: { type: Number, default: 0 }
    },
    merchant_feedback: {
        rating: { type: Number, min: 1, max: 5 },
        notes: { type: String, default: "" },
        feedback_date: { type: Date }
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
