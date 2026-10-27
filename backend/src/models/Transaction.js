const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    transaction_id: {
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
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    hour: {
        type: Number,
        required: true,
        min: 0,
        max: 23
    },
    minute: {
        type: Number,
        required: true,
        min: 0,
        max: 59
    },
    category: {
        type: String,
        default: "General",
        trim: true,
        index: true
    },
    payment_status: {
        type: String,
        default: "SUCCESS",
        index: true,
        trim: true
    },
    customerId: {
        type: String,
        trim: true,
        index: true,
        default: null
    },
    productId: {
        type: String,
        trim: true,
        default: null
    },
    productName: {
        type: String,
        trim: true,
        default: null
    },
    quantity: {
        type: Number,
        default: 1
    },
    unitPrice: {
        type: Number,
        default: function() { return this.amount || 0; }
    },
    paymentMethod: {
        type: String,
        default: "UPI",
        trim: true
    },
    source: {
        type: String,
        default: "POS",
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual aliases for API consistency
transactionSchema.virtual("transactionId").get(function() {
    return this.transaction_id;
});
transactionSchema.virtual("merchantName").get(function() {
    return this.merchant_name;
});
transactionSchema.virtual("totalAmount").get(function() {
    return this.amount;
});
transactionSchema.virtual("status").get(function() {
    return this.payment_status;
});

// Compound indexes for optimal aggregation performance
transactionSchema.index({ merchant_name: 1, payment_status: 1, date: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ merchant_name: 1, hour: 1 });

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
