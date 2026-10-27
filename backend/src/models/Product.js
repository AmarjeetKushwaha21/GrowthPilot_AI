const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    productId: {
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
    category: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    stock: {
        type: Number,
        default: 100
    },
    status: {
        type: String,
        enum: ["active", "inactive", "out_of_stock"],
        default: "active",
        index: true
    },
    salesCount: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

productSchema.index({ merchant_name: 1, category: 1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
