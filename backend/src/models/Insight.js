const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema({
    insightId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    merchant_name: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    type: {
        type: String,
        enum: ["sales_drop", "revenue_opportunity", "hourly_trend", "category_performance", "general"],
        default: "general",
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    supportingMetrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    generationTimestamp: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        default: "sarvam_ai"
    },
    status: {
        type: String,
        enum: ["active", "archived", "acknowledged"],
        default: "active",
        index: true
    }
}, {
    timestamps: true
});

insightSchema.index({ merchant_name: 1, generationTimestamp: -1 });

module.exports = mongoose.models.Insight || mongoose.model("Insight", insightSchema);
