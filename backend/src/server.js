// ─── Production Server Bootstrap ───
const app = require("./app");
const { config } = require("./config/env");
const { connectDB } = require("./config/database");
const Transaction = require("./models/Transaction");
const { loadCsvToMemory } = require("./services/analyticsService");
const { importTransactionsHelper } = require("./scripts/importTransactions");

async function startServer() {
    // 1. Preload CSV in-memory cache for resilient fallback
    try {
        await loadCsvToMemory();
    } catch (e) {
        console.warn("[Cache Warning] CSV preloading warning:", e.message);
    }

    // 2. Connect to MongoDB Atlas
    const dbStatus = await connectDB();

    if (dbStatus.isConnected) {
        try {
            const count = await Transaction.countDocuments();
            const merchants = await Transaction.distinct("merchant_name");
            if (count > 0) {
                console.log(`[MongoDB Storage Ready] ${count} transactions across ${merchants.length} merchants in Atlas database: ${config.DB_NAME}.`);
            } else {
                console.log("[MongoDB Storage Ready] Connected to GrowthPilotAI (empty collection). Performing automatic initial seed from CSV...");
                await importTransactionsHelper();
            }
        } catch (err) {
            console.error("[MongoDB Readiness Check Error]:", err.message);
        }
    } else {
        console.log(`[Storage Mode Active] Resilient fallback mode active using local dataset.`);
    }

    // 3. Start Express HTTP Server
    const server = app.listen(config.PORT, config.HOST, () => {
        console.log(`Server running on http://${config.HOST}:${config.PORT}`);
    });

    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = { startServer, app };
