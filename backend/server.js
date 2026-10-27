// ─── Entrypoint Forwarder ───
// Boots the modular server from src/server.js while preserving compatibility with Render & legacy test scripts.
const { startServer, app } = require("./src/server");

startServer();

module.exports = app;