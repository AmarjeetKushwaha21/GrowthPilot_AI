const mongoose = require("mongoose");

const recommendationSchema = new mongoose.Schema({
    recommendationId: {
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
    action: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    targetWindow: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        default: "General"
    },
    supportingEvidence: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ["recommended", "approved", "rejected", "active", "completed"],
        default: "recommended",
        index: true
    }
}, {
    timestamps: true
});

recommendationSchema.index({ merchant_name: 1, status: 1 });

module.exports = mongoose.models.Recommendation || mongoose.model("Recommendation", recommendationSchema);
