// ─── Resilient MongoDB Database Connection Module ───
const mongoose = require("mongoose");
const { config, sanitizeUri } = require("./env");

let isConnected = false;

/**
 * Establishes connection to MongoDB Atlas.
 * Targets database: GrowthPilotAI.
 * Resilient fallback to memory mode if connection fails without crashing the server.
 *
 * @returns {Promise<{ isConnected: boolean, mode: string, dbName?: string, error?: string }>}
 */
async function connectDB() {
    const uri = config.MONGODB_URI;

    // 1. Missing URI
    if (!uri || uri.trim() === "") {
        console.log("------------------------------------------------------------");
        console.log("[MongoDB Config] MONGODB_URI not configured in backend/.env.");
        console.log("[Storage Mode] Active: In-Memory Fallback (transactions.csv).");
        console.log("------------------------------------------------------------");
        isConnected = false;
        return { isConnected: false, mode: "in-memory", reason: "missing_uri" };
    }

    // 2. Placeholder credentials check
    if (config.hasPlaceholderCredentials) {
        console.log("------------------------------------------------------------");
        console.log("[MongoDB Notice] MONGODB_URI contains placeholder credentials:");
        console.log(`  -> ${config.sanitizedMongoUri}`);
        console.log("[Storage Mode] Active: In-Memory Fallback (transactions.csv).");
        console.log("To connect to live Atlas, set real credentials in backend/.env.");
        console.log("------------------------------------------------------------");
        isConnected = false;
        return { isConnected: false, mode: "in-memory", reason: "placeholder_credentials" };
    }

    // 3. Connect to MongoDB Atlas
    try {
        console.log(`[MongoDB] Connecting to database "${config.DB_NAME}" via Atlas (${config.sanitizedMongoUri})...`);

        const conn = await mongoose.connect(uri, {
            dbName: config.DB_NAME,
            serverSelectionTimeoutMS: 5000
        });

        isConnected = true;
        const dbName = conn.connection.name || config.DB_NAME;
        console.log("------------------------------------------------------------");
        console.log(`[MongoDB] Successfully connected to MongoDB Atlas!`);
        console.log(`[Database] Name: ${dbName}`);
        console.log(`[Storage Mode] Active: MongoDB Atlas (Persistent Storage)`);
        console.log("------------------------------------------------------------");

        return { isConnected: true, mode: "mongodb", dbName };
    } catch (error) {
        isConnected = false;
        console.log("------------------------------------------------------------");
        console.log(`[MongoDB Connection Error] Failed to connect to MongoDB Atlas.`);
        console.log(`[Reason] ${error.message}`);
        console.log(`[Storage Mode] Resilient fallback active: Using in-memory CSV transactions.`);
        console.log("------------------------------------------------------------");

        return { isConnected: false, mode: "in-memory", error: error.message };
    }
}

// Runtime connection monitoring listeners
mongoose.connection.on("disconnected", () => {
    if (isConnected) {
        console.warn("[MongoDB] Disconnected from Atlas. Runtime operations falling back to memory.");
        isConnected = false;
    }
});

mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Reconnected to MongoDB Atlas.");
    isConnected = true;
});

mongoose.connection.on("error", (err) => {
    console.error("[MongoDB Error Event]:", err.message);
});

function isDBConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

function getStorageMode() {
    return isDBConnected() ? "mongodb" : "in-memory";
}

module.exports = {
    connectDB,
    isDBConnected,
    getStorageMode,
    sanitizeUri
};
