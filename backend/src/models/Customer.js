const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    customerId: {
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
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    segment: {
        type: String,
        enum: ["VIP", "Regular", "Occasional", "At-Risk"],
        default: "Regular",
        index: true
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    lastPurchaseDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

customerSchema.index({ merchant_name: 1, segment: 1 });

module.exports = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
