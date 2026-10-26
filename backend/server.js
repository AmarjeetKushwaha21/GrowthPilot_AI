const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Ensure environment variables are loaded from backend/.env regardless of current working directory
const backendEnvPath = path.resolve(__dirname, ".env");
if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
} else {
    dotenv.config();
}

const express = require("express");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const { connectDB, isDBConnected, getStorageMode } = require("./config/db");
const Merchant = require("./models/Merchant");
const Transaction = require("./models/Transaction");
const Campaign = require("./models/Campaign");
const { analyzeHistoricalIntelligence } = require("./services/historicalIntelligence");
const {
    getCampaigns,
    saveCampaign,
    updateCampaignStatus,
    recordMerchantFeedback,
    buildHistoricalFeedbackSummary
} = require("./services/campaignFeedback");

const app = express();

// Sarvam AI Initialization
let sarvam = null;
try {
    const { SarvamAIClient } = require("sarvamai");
    sarvam = new SarvamAIClient({
        apiSubscriptionKey: process.env.SARVAM_API_KEY || "dummy_key"
    });
} catch (e) {
    console.log("Sarvam AI Client initialization warning:", e.message);
}

// In-memory cache for CSV transactions (fallback if MongoDB is unavailable)
let memoryTransactions = [];
let isMongoConnected = false;

// Preload CSV transactions for instant in-memory availability
function loadCsvToMemory() {
    return new Promise((resolve) => {
        const txns = [];
        const csvPath = path.join(__dirname, "transactions.csv");
        if (!fs.existsSync(csvPath)) {
            console.log("transactions.csv not found at", csvPath);
            return resolve([]);
        }
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {
                if (row.transaction_id && row.merchant_name) {
                    txns.push({
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
            .on("end", () => {
                memoryTransactions = txns;
                console.log(`[CSV Cache] Loaded ${memoryTransactions.length} transactions into memory cache.`);
                resolve(memoryTransactions);
            })
            .on("error", (err) => {
                console.log("CSV memory load error:", err.message);
                resolve([]);
            });
    });
}
// Initialize cache and connect to database
loadCsvToMemory().then(() => {
    return connectDB();
}).then(async (dbStatus) => {
    isMongoConnected = dbStatus.isConnected && mongoose.connection.readyState === 1;
    if (isMongoConnected) {
        try {
            const count = await Transaction.countDocuments();
            const merchants = await Transaction.distinct("merchant_name");
            if (count > 0) {
                console.log(`[MongoDB Storage Ready] ${count} transactions across ${merchants.length} merchants in Atlas database: GrowthPilotAI.`);
            } else {
                console.log("[MongoDB Storage Ready] Connected to GrowthPilotAI (empty collection). Run 'npm run migrate' or POST /api/import-transactions to import CSV data.");
            }
        } catch (e) {
            console.log("[MongoDB Transaction Count Error]:", e.message);
        }
    } else {
        console.log(`[Storage Mode Active] Resilient In-Memory Fallback using transactions.csv (${memoryTransactions.length} records available).`);
    }
});

// Helper function to import CSV into MongoDB with idempotent upserts (avoiding duplicates)
async function importTransactionsHelper() {
    return new Promise((resolve, reject) => {
        const transactions = [];
        const csvPath = path.join(__dirname, "transactions.csv");
        if (!fs.existsSync(csvPath)) {
            return reject(new Error(`transactions.csv not found at ${csvPath}`));
        }
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {
                if (row.transaction_id && row.merchant_name) {
                    transactions.push({
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
            .on("end", async () => {
                memoryTransactions = transactions;
                if (mongoose.connection.readyState === 1) {
                    try {
                        const bulkOps = transactions.map((t) => ({
                            updateOne: {
                                filter: { transaction_id: t.transaction_id },
                                update: { $set: t },
                                upsert: true
                            }
                        }));
                        const result = await Transaction.bulkWrite(bulkOps);
                        const total = await Transaction.countDocuments();
                        console.log(`[CSV Import] Synchronized ${transactions.length} records to MongoDB: ${result.upsertedCount} inserted, ${result.matchedCount} matched. Total in DB: ${total}`);
                        return resolve({
                            count: transactions.length,
                            upserted: result.upsertedCount,
                            matched: result.matchedCount,
                            totalInDb: total,
                            storageMode: "mongodb"
                        });
                    } catch (dbErr) {
                        return reject(dbErr);
                    }
                }
                resolve({ count: transactions.length, storageMode: "in-memory" });
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

app.use(express.json());

// CORS Middleware supporting all necessary methods
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// Resilient transaction retriever (uses MongoDB when connected, memory cache when not)
async function fetchTransactions(merchantName, filterSuccessOnly = true) {
    if (mongoose.connection.readyState === 1) {
        try {
            const query = { merchant_name: merchantName };
            if (filterSuccessOnly) query.payment_status = "SUCCESS";
            const txns = await Transaction.find(query).sort({ date: 1 }).lean();
            if (txns && txns.length > 0) return txns;
        } catch (e) {
            console.log("DB query error, using memory fallback:", e.message);
        }
    }

    // Memory fallback
    if (memoryTransactions.length === 0) {
        await loadCsvToMemory();
    }
    return memoryTransactions.filter(t => {
        const matchName = t.merchant_name === merchantName;
        if (!filterSuccessOnly) return matchName;
        return matchName && (t.payment_status || "SUCCESS").toUpperCase() === "SUCCESS";
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Root Health Check
app.get("/", (req, res) => {
    res.send("GrowthPilot AI Merchant Growth Backend is running!");
});

// System Health and Storage Status Endpoint
app.get("/api/health", (req, res) => {
    const isMongo = mongoose.connection.readyState === 1;
    res.json({
        success: true,
        status: "healthy",
        storageMode: isMongo ? "mongodb" : "in-memory-csv",
        mongoConnected: isMongo,
        cachedTransactions: memoryTransactions.length,
        timestamp: new Date().toISOString()
    });
});

// Available merchants list
app.get("/api/merchants", async (req, res) => {
    try {
        let merchants = [];
        if (mongoose.connection.readyState === 1) {
            merchants = await Transaction.distinct("merchant_name");
        }
        if (!merchants || merchants.length < 3) {
            if (memoryTransactions.length === 0) await loadCsvToMemory();
            const set = new Set(memoryTransactions.map(t => t.merchant_name));
            merchants = [...set];
        }
        const defaultMerchants = ["Sharma Café", "Gupta Sweets", "FreshBite Corner"];
        const finalMerchants = merchants.length >= 3 ? merchants : defaultMerchants;
        res.json({
            success: true,
            merchants: finalMerchants
        });
    } catch (error) {
        res.json({
            success: true,
            merchants: ["Sharma Café", "Gupta Sweets", "FreshBite Corner"]
        });
    }
});

// Merchant-wise campaign state (in-memory compatibility)
const merchantCampaigns = {};

// Campaign status route
app.get("/api/status", (req, res) => {
    const merchantName = req.query.merchant_name || "Sharma Café";
    const merchantState = merchantCampaigns[merchantName];

    res.json({
        success: true,
        merchantName: merchantName,
        campaignStatus: merchantState?.activated ? "Activated" : "Inactive",
        latestAction: merchantState?.action || null
    });
});

// Merchant overview stats
app.get("/api/merchant", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, true);

        if (transactions.length === 0) {
            return res.json({
                merchantName,
                currentSales: 0,
                lastMonthSales: 0,
                salesChange: 0,
                transactions: 0
            });
        }

        const latestDate = new Date(transactions[transactions.length - 1].date).toISOString().split("T")[0];

        const currentDayTransactions = transactions.filter(t =>
            new Date(t.date).toISOString().split("T")[0] === latestDate
        );

        const previousDayTransactions = transactions.filter(t =>
            new Date(t.date).toISOString().split("T")[0] !== latestDate
        );

        const currentSales = currentDayTransactions.reduce((sum, t) => sum + t.amount, 0);
        const previousSales = previousDayTransactions.reduce((sum, t) => sum + t.amount, 0);

        const previousDates = [...new Set(previousDayTransactions.map(t => new Date(t.date).toISOString().split("T")[0]))];
        const previousAverageSales = previousDates.length > 0 ? previousSales / previousDates.length : 0;

        const salesChange = previousAverageSales > 0 ? ((currentSales - previousAverageSales) / previousAverageSales) * 100 : 0;

        res.json({
            merchantName: merchantName,
            currentSales: Math.round(currentSales),
            lastMonthSales: Math.round(previousAverageSales),
            salesChange: Math.round(salesChange * 100) / 100,
            transactions: currentDayTransactions.length
        });

    } catch (error) {
        console.log("Merchant Data Error:", error);
        res.status(500).json({ message: "Error fetching merchant data" });
    }
});

// Seed merchant route
app.post("/api/seed-merchant", async (req, res) => {
    try {
        let merchant = {
            merchantName: "Sharma Café",
            currentSales: 5000,
            lastMonthSales: 10000,
            salesChange: -50,
            transactions: 142
        };

        if (mongoose.connection.readyState === 1) {
            merchant = await Merchant.create(merchant);
        }

        res.json({
            success: true,
            message: "Merchant data added to MongoDB!",
            merchant: merchant
        });
    } catch (error) {
        res.status(500).json({ message: "Error adding merchant data", error: error.message });
    }
});

// Import transactions route
app.post("/api/import-transactions", async (req, res) => {
    try {
        const result = await importTransactionsHelper();
        const inMongo = mongoose.connection.readyState === 1;
        res.json({
            success: true,
            message: inMongo
                ? `${result.count} transaction records synchronized with MongoDB Atlas.`
                : `${result.count} transaction records loaded into memory cache (MongoDB not connected).`,
            count: result.count,
            storageMode: inMongo ? "mongodb" : "in-memory",
            details: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "CSV import failed",
            error: error.message
        });
    }
});

// Sarvam AI Connectivity Test
app.get("/api/ai-test", async (req, res) => {
    try {
        if (!process.env.SARVAM_API_KEY || !sarvam) {
            return res.json({
                success: true,
                simulated: true,
                message: "Sarvam AI running in fallback demo mode (No SARVAM_API_KEY set)."
            });
        }
        const response = await sarvam.chat.completions({
            model: "sarvam-105b",
            messages: [{ role: "user", content: "Say hello in one short sentence." }]
        });
        res.json({ success: true, response: response });
    } catch (error) {
        console.log("Sarvam AI Error:", error);
        res.status(500).json({ success: false, message: "Sarvam AI test failed", error: error.message });
    }
});

// Business Health endpoint
app.get("/api/business-health", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, true);

        const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
        const eveningTransactions = transactions.filter(t => t.hour >= 18);
        const daytimeTransactions = transactions.filter(t => t.hour < 18);
        const eveningSales = eveningTransactions.reduce((sum, t) => sum + t.amount, 0);
        const daytimeSales = daytimeTransactions.reduce((sum, t) => sum + t.amount, 0);

        res.json({
            merchantName,
            totalTransactions: transactions.length,
            totalSales,
            daytimeSales,
            eveningSales,
            eveningTransactionCount: eveningTransactions.length,
            daytimeTransactionCount: daytimeTransactions.length
        });
    } catch (error) {
        console.log("Business Health Error:", error);
        res.status(500).json({ success: false, message: "Error analyzing business health" });
    }
});

// Hourly Analysis endpoint
app.get("/api/hourly-analysis", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, true);

        if (transactions.length === 0) {
            return res.json({ success: false, message: "No transaction data found" });
        }

        const latestDate = new Date(transactions[transactions.length - 1].date).toISOString().split("T")[0];
        const latestDayTransactions = transactions.filter(t => new Date(t.date).toISOString().split("T")[0] === latestDate);
        const historicalTransactions = transactions.filter(t => new Date(t.date).toISOString().split("T")[0] !== latestDate);

        const allHours = transactions.map(t => t.hour);
        const minHour = Math.min(...allHours, 7);
        const maxHour = Math.max(...allHours, 23);

        const previousDates = [...new Set(historicalTransactions.map(t => new Date(t.date).toISOString().split("T")[0]))];

        const latestDaySalesByHour = {};
        latestDayTransactions.forEach(t => {
            const h = t.hour;
            if (!latestDaySalesByHour[h]) latestDaySalesByHour[h] = 0;
            latestDaySalesByHour[h] += t.amount;
        });

        const historicalSalesByDateHour = {};
        historicalTransactions.forEach(t => {
            const d = new Date(t.date).toISOString().split("T")[0];
            const h = t.hour;
            if (!historicalSalesByDateHour[d]) historicalSalesByDateHour[d] = {};
            if (!historicalSalesByDateHour[d][h]) historicalSalesByDateHour[d][h] = 0;
            historicalSalesByDateHour[d][h] += t.amount;
        });

        const hourlyData = [];
        for (let hour = minHour; hour <= maxHour; hour++) {
            const sales = latestDaySalesByHour[hour] || 0;

            let historicalTotalSales = 0;
            previousDates.forEach(d => {
                if (historicalSalesByDateHour[d] && historicalSalesByDateHour[d][hour]) {
                    historicalTotalSales += historicalSalesByDateHour[d][hour];
                }
            });

            const historicalAverageSales = previousDates.length > 0 ? historicalTotalSales / previousDates.length : 0;

            hourlyData.push({
                hour: hour,
                sales: Math.round(sales * 100) / 100,
                historicalAverageSales: Math.round(historicalAverageSales * 100) / 100
            });
        }

        res.json({
            success: true,
            merchantName: merchantName,
            date: latestDate,
            hourlyData: hourlyData
        });
    } catch (error) {
        console.log("Hourly Analysis Error:", error);
        res.status(500).json({ success: false, message: "Error generating hourly analysis" });
    }
});

// Trigger Check endpoint
app.get("/api/trigger-check", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, true);

        if (transactions.length === 0) {
            return res.json({ success: false, message: "No transaction data found" });
        }

        const latestTransaction = transactions[transactions.length - 1];
        const currentDate = new Date(latestTransaction.date);
        const currentHour = latestTransaction.hour;
        const currentDateString = currentDate.toISOString().split("T")[0];

        const currentTransactions = transactions.filter(t =>
            t.hour === currentHour && new Date(t.date).toISOString().split("T")[0] === currentDateString
        );

        const historicalTransactions = transactions.filter(t =>
            t.hour === currentHour && new Date(t.date).toISOString().split("T")[0] !== currentDateString
        );

        const dailyCounts = {};
        historicalTransactions.forEach(t => {
            const date = new Date(t.date).toISOString().split("T")[0];
            if (!dailyCounts[date]) dailyCounts[date] = 0;
            dailyCounts[date]++;
        });

        const historicalCounts = Object.values(dailyCounts);
        const historicalAverage = historicalCounts.length > 0 ? historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length : 0;
        const currentCount = currentTransactions.length;

        let deviation = 0;
        if (historicalAverage > 0) {
            deviation = ((historicalAverage - currentCount) / historicalAverage) * 100;
        }

        const threshold = 30;
        const triggered = deviation >= threshold;

        res.json({
            success: true,
            merchantName: merchantName,
            currentDate: currentDateString,
            currentHour,
            currentTransactions: currentCount,
            historicalAverage: Math.round(historicalAverage * 100) / 100,
            deviation: Math.round(deviation * 100) / 100,
            threshold,
            triggered
        });
    } catch (error) {
        console.log("Trigger Check Error:", error);
        res.status(500).json({ success: false, message: "Trigger check failed" });
    }
});

// Opportunity detection endpoint
app.get("/api/opportunity", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, false);

        const hourlyData = {};
        transactions.forEach(t => {
            const date = new Date(t.date).toISOString().split("T")[0];
            const hour = t.hour;
            const key = `${date}-${hour}`;
            if (!hourlyData[key]) hourlyData[key] = 0;
            hourlyData[key] += t.amount;
        });

        const dates = [...new Set(transactions.map(t => new Date(t.date).toISOString().split("T")[0]))].sort();
        const currentDate = dates[dates.length - 1];
        const threshold = 20;
        const opportunities = [];

        for (const key in hourlyData) {
            if (!key.startsWith(currentDate)) continue;
            const hour = Number(key.split("-")[3]);
            const historicalValues = dates.slice(0, -1).map(date => hourlyData[`${date}-${hour}`]).filter(v => v !== undefined);
            if (historicalValues.length === 0) continue;

            const baseline = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
            const currentValue = hourlyData[key];
            const deviation = ((currentValue - baseline) / (baseline || 1)) * 100;

            if (deviation <= -threshold) {
                opportunities.push({
                    date: currentDate,
                    hour: hour,
                    currentHourlyValue: currentValue,
                    baseline: Number(baseline.toFixed(2)),
                    deviation: Number(deviation.toFixed(2)),
                    threshold: threshold,
                    opportunity: true,
                    message: `Sales dropped ${Math.abs(deviation).toFixed(2)}% below the historical baseline.`
                });
            }
        }

        res.json({
            success: true,
            merchantName: merchantName,
            currentDate: currentDate,
            threshold: `${threshold}%`,
            opportunityDetected: opportunities.length > 0,
            opportunities: opportunities.sort((a, b) => a.hour - b.hour)
        });
    } catch (error) {
        console.log("Opportunity Detection Error:", error);
        res.status(500).json({ success: false, message: "Error detecting growth opportunity" });
    }
});

// AI Business Analysis endpoint
app.get("/api/ai-business-analysis", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, true);

        const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
        const eveningTransactions = transactions.filter(t => t.hour >= 18);
        const daytimeTransactions = transactions.filter(t => t.hour < 18);
        const eveningSales = eveningTransactions.reduce((sum, t) => sum + t.amount, 0);
        const daytimeSales = daytimeTransactions.reduce((sum, t) => sum + t.amount, 0);

        let aiText = "";

        if (process.env.SARVAM_API_KEY && sarvam) {
            try {
                const prompt = `
You are an AI business partner for ${merchantName}, a small business.

Analyze this simulated transaction data:
- Merchant: ${merchantName}
- Total Sales: ₹${totalSales}
- Daytime Sales (before 6 PM): ₹${daytimeSales} (${daytimeTransactions.length} txns)
- Evening Sales (after 6 PM): ₹${eveningSales} (${eveningTransactions.length} txns)

Provide a concise, professional 2-sentence executive summary identifying the key business pattern and strategic growth opportunity. Be direct and business-focused.
`;
                const response = await sarvam.chat.completions({
                    model: "sarvam-105b",
                    messages: [{ role: "user", content: prompt }]
                });
                aiText = response.choices[0].message.content;
            } catch (sarvamErr) {
                console.log("Sarvam AI business analysis call error:", sarvamErr.message);
            }
        }

        if (!aiText) {
            aiText = `${merchantName} demonstrates consistent transaction volume during daytime hours (₹${daytimeSales.toLocaleString("en-IN")}), but experiences a sharp drop in evening revenue (₹${eveningSales.toLocaleString("en-IN")}). The primary growth opportunity lies in activating post-6 PM customer demand with targeted evening combo offers.`;
        }

        res.json({
            success: true,
            merchantName,
            businessData: {
                totalSales,
                daytimeSales,
                eveningSales,
                daytimeTransactions: daytimeTransactions.length,
                eveningTransactions: eveningTransactions.length
            },
            aiAnalysis: aiText
        });
    } catch (error) {
        console.log("AI Business Analysis Error:", error);
        res.status(500).json({ success: false, message: "AI business analysis failed", error: error.message });
    }
});

// AI Growth Recommendation WITH HISTORICAL FEEDBACK LOOP
app.get("/api/ai-growth-recommendation", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, false);

        if (transactions.length === 0) {
            return res.json({
                success: false,
                merchantName,
                message: "No transaction data found for this merchant."
            });
        }

        const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

        const hourlyData = {};
        transactions.forEach(t => {
            const date = new Date(t.date).toISOString().split("T")[0];
            const hour = t.hour;
            const key = `${date}-${hour}`;
            if (!hourlyData[key]) hourlyData[key] = 0;
            hourlyData[key] += t.amount;
        });

        const dates = [...new Set(transactions.map(t => new Date(t.date).toISOString().split("T")[0]))].sort();
        const currentDate = dates[dates.length - 1];
        const opportunities = [];

        for (const key in hourlyData) {
            if (!key.startsWith(currentDate)) continue;
            const hour = Number(key.split("-")[3]);
            const historicalValues = dates.slice(0, -1).map(date => hourlyData[`${date}-${hour}`]).filter(v => v !== undefined);
            if (historicalValues.length === 0) continue;

            const baseline = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
            const currentValue = hourlyData[key];
            const deviation = ((currentValue - baseline) / (baseline || 1)) * 100;

            if (deviation <= -20) {
                opportunities.push({
                    hour,
                    currentValue,
                    baseline: Number(baseline.toFixed(2)),
                    deviation: Number(deviation.toFixed(2))
                });
            }
        }

        let opportunity;
        if (opportunities.length > 0) {
            opportunity = opportunities.sort((a, b) => a.deviation - b.deviation)[0];
        } else {
            opportunity = { hour: 19, currentValue: 120, baseline: 350, deviation: -65.71 };
        }

        // RETRIEVE HISTORICAL CAMPAIGN FEEDBACK LOOP
        const feedbackSummary = await buildHistoricalFeedbackSummary(merchantName, isMongoConnected);

        let recommendations = [];

        if (process.env.SARVAM_API_KEY && sarvam) {
            const prompt = `
You are GrowthPilot AI, an AI growth partner for ${merchantName}.

A business opportunity has been detected:
- Merchant: ${merchantName}
- Main categories sold: ${categories.join(", ")}
- Low activity window: ${opportunity.hour}:00 - ${opportunity.hour + 1}:00
- Current sales in window: ₹${opportunity.currentValue}
- Historical baseline: ₹${opportunity.baseline}
- Sales drop: ${Math.abs(opportunity.deviation)}% below baseline

HISTORICAL CAMPAIGN OUTCOMES FOR THIS MERCHANT:
${feedbackSummary.summaryText}
(Note: Treat historical outcomes as empirical evidence to guide realistic recommendations, not as future guarantees.)

Generate EXACTLY 3 distinct, practical, actionable growth recommendations tailored specifically to ${merchantName}'s business context to boost sales during this window.

Return ONLY a raw JSON array of 3 objects with NO markdown formatting or commentary:
[
  {
    "action": "Short Title 1",
    "description": "Short 1-sentence explanation of what to do.",
    "discount": 10
  },
  {
    "action": "Short Title 2",
    "description": "Short 1-sentence explanation of what to do.",
    "discount": 15
  },
  {
    "action": "Short Title 3",
    "description": "Short 1-sentence explanation of what to do.",
    "discount": 5
  }
]

Rules:
- Generate 3 distinct actions tailored to ${merchantName}.
- Each discount must be a number between 5 and 20.
- Return ONLY valid JSON array of 3 recommendation objects.
`;

            try {
                const response = await sarvam.chat.completions({
                    model: "sarvam-105b",
                    messages: [{ role: "user", content: prompt }]
                });

                const aiText = response.choices[0].message.content;
                const cleanText = aiText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
                const parsed = JSON.parse(cleanText);

                if (Array.isArray(parsed) && parsed.length > 0) {
                    recommendations = parsed;
                }
            } catch (aiErr) {
                console.log("Sarvam AI recommendation call or parsing error:", aiErr.message);
            }
        }

        // Contextual fallback guaranteeing 3 distinct recommendations
        if (!Array.isArray(recommendations) || recommendations.length < 3) {
            const cat1 = categories[0] || "Featured";
            const cat2 = categories[1] || "Popular";
            const cat3 = categories[2] || "Special";

            recommendations = [
                {
                    action: `${cat1} Combo Offer`,
                    description: `Offer a targeted ${cat1.toLowerCase()} combo during the ${opportunity.hour}:00–${opportunity.hour + 1}:00 low-activity period.`,
                    discount: 15
                },
                {
                    action: `Time-Limited ${cat2} Discount`,
                    description: `Run a time-limited discount on ${cat2.toLowerCase()} items during the low-activity window.`,
                    discount: 10
                },
                {
                    action: `${cat3} Product Promotion`,
                    description: `Promote high-demand ${cat3.toLowerCase()} items to increase footfall during quiet hours.`,
                    discount: 5
                }
            ];
        }

        // Attach supporting evidence and persistent campaign IDs
        const enrichedRecommendations = recommendations.map((rec, idx) => {
            const campaignId = `REC-${merchantName.replace(/\s+/g, "").toUpperCase()}-${opportunity.hour}-${idx + 1}`;
            return {
                id: campaignId,
                action: rec.action,
                description: rec.description,
                discount: rec.discount || 10,
                target_window: `${String(opportunity.hour).padStart(2, "0")}:00 - ${String((opportunity.hour + 1) % 24).padStart(2, "0")}:00`,
                category: categories[idx % categories.length] || "General",
                supporting_evidence: {
                    observed_sales: `₹${opportunity.currentValue} vs baseline ₹${opportunity.baseline}`,
                    drop_percentage: `${Math.abs(opportunity.deviation)}%`,
                    historical_reference: feedbackSummary.hasHistory
                        ? "Aligned with previous successful uplift experiments for this merchant."
                        : "Baseline initial recommendation based on observed drop."
                }
            };
        });

        // Register recommended campaigns in storage
        for (const rec of enrichedRecommendations) {
            await saveCampaign({
                campaign_id: rec.id,
                merchant_name: merchantName,
                campaign_type: "Discount Offer",
                title: rec.action,
                description: rec.description,
                target_window: rec.target_window,
                discount: rec.discount,
                category: rec.category,
                recommendation_reason: `Sales drop of ${opportunity.deviation}% observed during ${rec.target_window}.`,
                supporting_evidence: {
                    current_window_sales: opportunity.currentValue,
                    baseline_sales: opportunity.baseline,
                    drop_percentage: Math.abs(opportunity.deviation),
                    historical_campaign_reference: rec.supporting_evidence.historical_reference
                },
                status: "recommended",
                execution_type: "simulated",
                baseline_metrics: {
                    sales: opportunity.currentValue,
                    baseline_hourly: opportunity.baseline
                }
            }, isMongoConnected);
        }

        res.json({
            success: true,
            merchantName: merchantName,
            opportunity: opportunity,
            recommendations: enrichedRecommendations,
            historicalFeedbackUsed: feedbackSummary.hasHistory,
            historicalContext: feedbackSummary.summaryText
        });

    } catch (error) {
        console.log("AI Growth Recommendation Error:", error);
        res.status(500).json({
            success: false,
            message: "Error generating AI growth recommendations",
            error: error.message
        });
    }
});

// Campaign result endpoint
app.get("/api/campaign-result", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const merchantState = merchantCampaigns[merchantName];

        if (!merchantState?.activated || !merchantState.action) {
            return res.json({
                success: false,
                message: "No campaign has been activated yet."
            });
        }

        const transactions = await fetchTransactions(merchantName, true);

        if (transactions.length === 0) {
            return res.json({
                success: false,
                message: "No transaction data available."
            });
        }

        const latestDate = new Date(transactions[transactions.length - 1].date)
            .toISOString()
            .split("T")[0];

        const latestDayTransactions = transactions.filter(
            t => new Date(t.date).toISOString().split("T")[0] === latestDate
        );

        const currentSales = latestDayTransactions.reduce(
            (sum, t) => sum + t.amount,
            0
        );

        const previousTransactions = transactions.filter(
            t => new Date(t.date).toISOString().split("T")[0] !== latestDate
        );

        const previousDates = [
            ...new Set(
                previousTransactions.map(
                    t => new Date(t.date).toISOString().split("T")[0]
                )
            )
        ];

        const previousSales = previousTransactions.reduce(
            (sum, t) => sum + t.amount,
            0
        );

        const previousAverageSales =
            previousDates.length > 0
                ? previousSales / previousDates.length
                : 0;

        const simulatedUplift = 12;

        const simulatedSalesAfterCampaign = Math.round(
            currentSales * (1 + simulatedUplift / 100)
        );

        res.json({
            success: true,
            merchantName,
            result: {
                previousSales: Math.round(previousAverageSales),
                currentSales: simulatedSalesAfterCampaign,
                salesUplift: simulatedUplift,
                campaign: merchantState.action.type,
                status: "Completed",
                simulated: true
            }
        });

    } catch (error) {
        console.log("Campaign Result Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching campaign result",
            error: error.message
        });
    }
});

// Action activation endpoint (Existing + Synchronized with Campaign Storage)
app.post("/api/action", async (req, res) => {
    try {
        const action = req.body;

        const merchantName =
            action.merchant_name ||
            action.merchantName ||
            "Sharma Café";

        merchantCampaigns[merchantName] = {
            activated: true,
            action: action
        };

        console.log(`Growth Action Received for ${merchantName}:`, action);

        // Update / Save in Campaign Model
        const campaignId = action.id || `CMP-${Date.now()}`;
        const discount = Number(action.discount) || 10;
        const upliftPercent = Math.round((8 + (discount * 0.4)) * 10) / 10;

        await saveCampaign({
            campaign_id: campaignId,
            merchant_name: merchantName,
            campaign_type: action.type || "Growth Action",
            title: action.type || "Activated Campaign",
            description: action.description || `Growth action activated for ${merchantName}`,
            discount: discount,
            status: "active",
            execution_type: "simulated",
            outcome_metrics: {
                simulated: true,
                uplift_percent: upliftPercent
            }
        }, isMongoConnected);

        let n8nStatus = "n8n unavailable";
        try {
            const n8nResponse = await fetch("http://localhost:5678/webhook/merchant-growth-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action)
            });

            const n8nResult = await n8nResponse.text();
            console.log("n8n Response:", n8nResult);
            n8nStatus = "Action sent to n8n successfully";
        } catch (n8nError) {
            // n8n is optional external automation webhook
        }

        res.json({
            success: true,
            message: `Growth action "${action.type || "Campaign"}" approved and activated for ${merchantName}.`,
            merchantName: merchantName,
            action: action,
            n8n: n8nStatus
        });

    } catch (error) {
        console.log("Action Error:", error);
        res.status(500).json({
            success: false,
            message: "Growth action activation failed.",
            error: error.message
        });
    }
});

// ─── NEW HISTORICAL BUSINESS INTELLIGENCE ENDPOINT ───
app.get("/api/historical-intelligence", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const transactions = await fetchTransactions(merchantName, false);
        const report = analyzeHistoricalIntelligence(transactions, merchantName);

        res.json({
            success: true,
            ...report
        });
    } catch (error) {
        console.log("Historical Intelligence Error:", error);
        res.status(500).json({
            success: false,
            message: "Error calculating historical business intelligence",
            error: error.message
        });
    }
});

// ─── NEW CAMPAIGN HISTORY & OUTCOME TRACKING ENDPOINTS ───

// Get all campaigns for merchant
app.get("/api/campaigns", async (req, res) => {
    try {
        const merchantName = req.query.merchant_name || "Sharma Café";
        const campaigns = await getCampaigns(merchantName, isMongoConnected);
        res.json({
            success: true,
            merchantName,
            count: campaigns.length,
            campaigns
        });
    } catch (error) {
        console.log("Get Campaigns Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving campaign history",
            error: error.message
        });
    }
});

// Create / Register Campaign
app.post("/api/campaigns", async (req, res) => {
    try {
        const campaignData = req.body;
        if (!campaignData.merchant_name || !campaignData.title) {
            return res.status(400).json({
                success: false,
                message: "merchant_name and title are required."
            });
        }
        const saved = await saveCampaign(campaignData, isMongoConnected);
        res.json({
            success: true,
            campaign: saved
        });
    } catch (error) {
        console.log("Save Campaign Error:", error);
        res.status(500).json({
            success: false,
            message: "Error saving campaign",
            error: error.message
        });
    }
});

// Update Campaign Status (Approval, Rejection, Activation, Completion)
app.patch("/api/campaigns/:id/status", async (req, res) => {
    try {
        const campaignId = req.params.id;
        const { status, merchant_name } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        const updated = await updateCampaignStatus(campaignId, status, isMongoConnected);

        // Keep merchantCampaigns state updated
        if (status === "active" || status === "approved") {
            const mName = merchant_name || updated.merchant_name || "Sharma Café";
            merchantCampaigns[mName] = {
                activated: true,
                action: {
                    type: updated.title,
                    discount: updated.discount,
                    id: updated.campaign_id
                }
            };
        }

        res.json({
            success: true,
            message: `Campaign status updated to "${status}".`,
            campaign: updated
        });
    } catch (error) {
        console.log("Update Campaign Status Error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating campaign status",
            error: error.message
        });
    }
});

// Record Merchant Feedback for Campaign
app.post("/api/campaigns/:id/feedback", async (req, res) => {
    try {
        const campaignId = req.params.id;
        const { rating, notes } = req.body;

        if (!rating) {
            return res.status(400).json({ success: false, message: "Rating (1-5) is required" });
        }

        const updated = await recordMerchantFeedback(campaignId, rating, notes, isMongoConnected);
        res.json({
            success: true,
            message: "Feedback recorded successfully. Historical feedback will inform future AI recommendations.",
            campaign: updated
        });
    } catch (error) {
        console.log("Record Feedback Error:", error);
        res.status(500).json({
            success: false,
            message: "Error recording campaign feedback",
            error: error.message
        });
    }
});

// ─── NEW AI GROWTH AGENT COORDINATOR ENDPOINTS ───

// Agent execution cycle
app.post("/api/agent/cycle", async (req, res) => {
    try {
        const merchantName = req.body.merchant_name || "Sharma Café";

        // Step 1: Transaction Analysis & Deterministic Metrics
        const transactions = await fetchTransactions(merchantName, false);
        const intelligence = analyzeHistoricalIntelligence(transactions, merchantName);

        // Step 2: Opportunity Identification
        const dates = [...new Set(transactions.map(t => new Date(t.date).toISOString().split("T")[0]))].sort();
        const currentDate = dates[dates.length - 1];

        // Group hourly sales for current day
        const hourlySales = {};
        transactions.forEach(t => {
            const d = new Date(t.date).toISOString().split("T")[0];
            const h = t.hour;
            const k = `${d}-${h}`;
            if (!hourlySales[k]) hourlySales[k] = 0;
            hourlySales[k] += t.amount;
        });

        // Find primary low activity window
        let chosenOpportunity = null;
        for (let h = 14; h <= 21; h++) {
            const currentVal = hourlySales[`${currentDate}-${h}`] || 0;
            const prevVals = dates.slice(0, -1).map(d => hourlySales[`${d}-${h}`]).filter(v => v !== undefined);
            const baseline = prevVals.length > 0 ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 300;
            const drop = ((currentVal - baseline) / (baseline || 1)) * 100;
            if (drop <= -20 && (!chosenOpportunity || drop < chosenOpportunity.drop)) {
                chosenOpportunity = {
                    hour: h,
                    currentSales: currentVal,
                    baseline: Math.round(baseline),
                    drop: Math.round(drop * 10) / 10,
                    window: `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`
                };
            }
        }

        if (!chosenOpportunity) {
            chosenOpportunity = {
                hour: 19,
                currentSales: 120,
                baseline: 350,
                drop: -65.7,
                window: "19:00 - 20:00"
            };
        }

        // Step 3: Retrieve Past Outcomes (Feedback Loop)
        const feedback = await buildHistoricalFeedbackSummary(merchantName, isMongoConnected);

        // Step 4: Formulate Recommendation with Supporting Evidence
        const topCategory = intelligence.categoryTrends[0]?.category || "Featured Special";
        const suggestedDiscount = 15;
        const projectedUplift = 12.0;
        const candidateTitle = `${topCategory} Evening Happy Hour`;
        const candidateDesc = `Launch a targeted ${suggestedDiscount}% promotional discount on ${topCategory.toLowerCase()} items during ${chosenOpportunity.window}.`;

        const agentCampaignId = `AGENT-${merchantName.replace(/\s+/g, "").toUpperCase()}-${Date.now()}`;

        const stagedCampaign = {
            campaign_id: agentCampaignId,
            merchant_name: merchantName,
            campaign_type: "AI Agent Recommendation",
            title: candidateTitle,
            description: candidateDesc,
            target_window: chosenOpportunity.window,
            discount: suggestedDiscount,
            category: topCategory,
            recommendation_reason: `Sales drop of ${Math.abs(chosenOpportunity.drop)}% observed in ${chosenOpportunity.window} window.`,
            supporting_evidence: {
                current_window_sales: chosenOpportunity.currentSales,
                baseline_sales: chosenOpportunity.baseline,
                drop_percentage: Math.abs(chosenOpportunity.drop),
                historical_campaign_reference: feedback.hasHistory
                    ? "Similar past promotions achieved positive merchant satisfaction."
                    : "Calibrated based on category profit margins."
            },
            status: "recommended",
            execution_type: "simulated",
            baseline_metrics: {
                sales: intelligence.metrics.currentSales,
                transactions: intelligence.metrics.currentOrders,
                window_sales: chosenOpportunity.currentSales,
                baseline_hourly: chosenOpportunity.baseline
            },
            outcome_metrics: {
                simulated: true,
                projected_sales: Math.round(intelligence.metrics.currentSales * (1 + projectedUplift / 100)),
                uplift_percent: projectedUplift
            }
        };

        const saved = await saveCampaign(stagedCampaign, isMongoConnected);

        res.json({
            success: true,
            agentState: {
                stage: "Awaiting Merchant Approval",
                flowStage: "Recommend",
                merchantName,
                opportunity: chosenOpportunity,
                recommendation: saved,
                supportingEvidence: {
                    dropPercentage: `${Math.abs(chosenOpportunity.drop)}%`,
                    observedDrop: `₹${chosenOpportunity.currentSales} vs normal ₹${chosenOpportunity.baseline}`,
                    window: chosenOpportunity.window,
                    categoryInfluence: `${topCategory} represents ${intelligence.categoryTrends[0]?.sharePercentage || 35}% of sales volume`,
                    historicalFeedbackApplied: feedback.hasHistory
                },
                requiresApproval: true,
                executionMode: "simulated"
            }
        });

    } catch (error) {
        console.log("Agent Cycle Error:", error);
        res.status(500).json({
            success: false,
            message: "Error executing AI Growth Agent cycle",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});