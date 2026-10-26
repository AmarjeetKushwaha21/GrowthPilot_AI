// ─── Reusable MongoDB Connection Module ───
// Connects to MongoDB Atlas using Mongoose with resilient fallback handling.
const mongoose = require("mongoose");

let isConnected = false;

/**
 * Sanitizes a MongoDB connection string to safely log without leaking credentials.
 * @param {string} uri 
 * @returns {string} Sanitized URI
 */
function sanitizeUri(uri) {
    if (!uri || typeof uri !== "string") return "";
    try {
        return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    } catch {
        return "mongodb+srv://***:***@[masked]";
    }
}

/**
 * Checks if the URI contains obvious template placeholders.
 * @param {string} uri
 * @returns {boolean}
 */
function hasPlaceholderCredentials(uri) {
    if (!uri) return false;
    const placeholders = [
        "<username>",
        "<password>",
        "<cluster-host>",
        "username:password",
        "@cluster.mongodb.net",
        "your_username",
        "your_password"
    ];
    return placeholders.some(p => uri.includes(p));
}

/**
 * Establishes connection to MongoDB Atlas.
 * Targets database: GrowthPilotAI.
 * Falls back safely to in-memory mode on failure without crashing the server.
 * 
 * @returns {Promise<{ isConnected: boolean, mode: string, message?: string }>}
 */
async function connectDB() {
    const uri = process.env.MONGODB_URI;

    // 1. Check if URI is missing
    if (!uri || uri.trim() === "") {
        console.log("------------------------------------------------------------");
        console.log("[MongoDB Config] MONGODB_URI not configured in backend/.env.");
        console.log("[Storage Mode] Active: In-Memory Fallback (transactions.csv).");
        console.log("------------------------------------------------------------");
        isConnected = false;
        return { isConnected: false, mode: "in-memory", reason: "missing_uri" };
    }

    // 2. Check if URI contains template placeholders
    if (hasPlaceholderCredentials(uri)) {
        console.log("------------------------------------------------------------");
        console.log("[MongoDB Notice] MONGODB_URI in backend/.env contains placeholder credentials:");
        console.log(`  -> ${sanitizeUri(uri)}`);
        console.log("[Storage Mode] Active: In-Memory Fallback (transactions.csv).");
        console.log("To connect to live Atlas, replace placeholders with real credentials in backend/.env.");
        console.log("------------------------------------------------------------");
        isConnected = false;
        return { isConnected: false, mode: "in-memory", reason: "placeholder_credentials" };
    }

    // 3. Attempt Connection to MongoDB Atlas
    try {
        console.log(`[MongoDB] Connecting to database "GrowthPilotAI" via Atlas (${sanitizeUri(uri)})...`);
        
        const conn = await mongoose.connect(uri, {
            dbName: "GrowthPilotAI",
            serverSelectionTimeoutMS: 5000 // 5s timeout to prevent hanging on network/firewall issues
        });

        isConnected = true;
        const dbName = conn.connection.name || "GrowthPilotAI";
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

// Connection event listeners for runtime monitoring
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
