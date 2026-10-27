// ─── Environment Configuration & Validation ───
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load backend/.env safely regardless of current working directory
const backendEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
} else {
    dotenv.config();
}

/**
 * Sanitizes MongoDB connection string to safely log without leaking credentials.
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

const config = {
    PORT: process.env.PORT || 5001,
    HOST: process.env.HOST || "0.0.0.0",
    NODE_ENV: process.env.NODE_ENV || "development",
    MONGODB_URI: process.env.MONGODB_URI || "",
    DB_NAME: "GrowthPilotAI",
    SARVAM_API_KEY: process.env.SARVAM_API_KEY || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
    isProduction: process.env.NODE_ENV === "production",
    hasPlaceholderCredentials: hasPlaceholderCredentials(process.env.MONGODB_URI || ""),
    sanitizedMongoUri: sanitizeUri(process.env.MONGODB_URI || "")
};

module.exports = {
    config,
    sanitizeUri,
    hasPlaceholderCredentials
};
