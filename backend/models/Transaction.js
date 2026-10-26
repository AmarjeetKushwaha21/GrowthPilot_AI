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
        trim: true
    },
    payment_status: {
        type: String,
        default: "SUCCESS",
        index: true,
        trim: true
    }
}, {
    timestamps: false
});

// Compound index for optimal performance when querying merchant transactions sorted by date
transactionSchema.index({ merchant_name: 1, payment_status: 1, date: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);