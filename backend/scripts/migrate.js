// ─── Explicit Migration Script: CSV to MongoDB Atlas ───
// Safely imports or synchronizes transactions.csv into MongoDB Atlas database GrowthPilotAI.
// Idempotent: Can be run repeatedly without creating duplicate records.

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load backend/.env safely regardless of execution directory
const backendEnvPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
} else {
    dotenv.config();
}

const { connectDB } = require("../config/db");
const Transaction = require("../models/Transaction");

/**
 * Parses transactions.csv into typed record objects.
 * @param {string} csvPath 
 * @returns {Promise<Array>}
 */
function readCsv(csvPath) {
    return new Promise((resolve, reject) => {
        const records = [];
        if (!fs.existsSync(csvPath)) {
            return reject(new Error(`CSV file not found at: ${csvPath}`));
        }

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {
                if (row.transaction_id && row.merchant_name) {
                    records.push({
                        transaction_id: String(row.transaction_id).trim(),
                        merchant_name: String(row.merchant_name).trim(),
                        amount: Number(row.amount) || 0,
                        date: new Date(row.date),
                        hour: Number(row.hour),
                        minute: Number(row.minute),
                        category: row.category ? String(row.category).trim() : "General",
                        payment_status: row.payment_status ? String(row.payment_status).trim() : "SUCCESS"
                    });
                }
            })
            .on("end", () => resolve(records))
            .on("error", (err) => reject(err));
    });
}

async function runMigration() {
    console.log("============================================================");
    console.log("   GrowthPilot AI — CSV to MongoDB Migration Tool           ");
    console.log("============================================================");

    const csvPath = path.resolve(__dirname, "..", "transactions.csv");
    console.log(`[1/4] Reading transaction records from: ${csvPath}`);

    let records = [];
    try {
        records = await readCsv(csvPath);
        console.log(`[CSV Read] Successfully parsed ${records.length} records.`);
    } catch (err) {
        console.error(`[Error] Failed to read CSV:`, err.message);
        process.exit(1);
    }

    if (records.length === 0) {
        console.error("[Error] No valid transactions found in CSV to migrate.");
        process.exit(1);
    }

    console.log("\n[2/4] Connecting to MongoDB Atlas...");
    const connResult = await connectDB();

    if (!connResult.isConnected || mongoose.connection.readyState !== 1) {
        console.error("\n[Migration Aborted] MongoDB is not connected.");
        console.error("Please configure a valid MONGODB_URI in backend/.env before running migration.");
        process.exit(1);
    }

    console.log("\n[3/4] Performing idempotent bulk upsert (avoiding duplicate records)...");
    try {
        const bulkOps = records.map((record) => ({
            updateOne: {
                filter: { transaction_id: record.transaction_id },
                update: { $set: record },
                upsert: true
            }
        }));

        const result = await Transaction.bulkWrite(bulkOps);

        const totalInDb = await Transaction.countDocuments();
        const merchants = await Transaction.distinct("merchant_name");

        console.log("\n[4/4] Migration Complete!");
        console.log("------------------------------------------------------------");
        console.log(`  Records in CSV:       ${records.length}`);
        console.log(`  New records inserted: ${result.upsertedCount}`);
        console.log(`  Existing matched:     ${result.matchedCount}`);
        console.log(`  Existing updated:     ${result.modifiedCount}`);
        console.log(`  Total in MongoDB:     ${totalInDb}`);
        console.log(`  Merchants:            ${merchants.join(", ")}`);
        console.log("------------------------------------------------------------");
        console.log("Database write verified. Data is successfully stored in MongoDB Atlas.");

        await mongoose.disconnect();
        console.log("MongoDB connection closed cleanly.");
        process.exit(0);
    } catch (err) {
        console.error("[Migration Error] Failed during bulkWrite:", err.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

if (require.main === module) {
    runMigration();
}

module.exports = { runMigration, readCsv };
