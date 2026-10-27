// ─── Centralized Error Handling Middleware ───
const { config } = require("../config/env");

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;

    // Log internally with sanitized message
    console.error(`[Error] ${req.method} ${req.url} - Status ${statusCode}:`, err.message);

    res.status(statusCode).json({
        success: false,
        message: err.message || "An unexpected internal server error occurred.",
        ...(config.NODE_ENV === "development" ? { stack: err.stack } : {})
    });
}

module.exports = errorHandler;
