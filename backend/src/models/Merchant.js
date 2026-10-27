const mongoose = require("mongoose");

const merchantSchema = new mongoose.Schema({
    merchantName: { type: String, required: true, unique: true, index: true },
    currentSales: { type: Number, default: 0 },
    lastMonthSales: { type: Number, default: 0 },
    salesChange: { type: Number, default: 0 },
    transactions: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.models.Merchant || mongoose.model("Merchant", merchantSchema);
