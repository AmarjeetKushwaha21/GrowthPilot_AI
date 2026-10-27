// ─── GrowthPilot AI Express Application ───
const express = require("express");
const { config } = require("./config/env");

// Routes
const healthRoutes = require("./routes/healthRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const customerRoutes = require("./routes/customerRoutes");
const insightRoutes = require("./routes/insightRoutes");
const campaignRoutes = require("./routes/campaignRoutes");

// Middleware
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

app.use(express.json());

// Resilient CORS Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

// Root welcome endpoint
app.get("/", (req, res) => {
    res.send("GrowthPilot AI Merchant Growth Backend is running!");
});

// Mount /api routes
app.use("/api", healthRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", transactionRoutes);
app.use("/api", customerRoutes);
app.use("/api", insightRoutes);
app.use("/api", campaignRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
