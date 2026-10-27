// ─── Analytics & Metrics Aggregation Service ───
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { isDBConnected } = require("../config/database");

// In-memory fallback cache if MongoDB is not accessible
let memoryTransactions = [];

function loadCsvToMemory() {
    return new Promise((resolve) => {
        const txns = [];
        const candidates = [
            path.resolve(__dirname, "../../data/transactions.csv"),
            path.resolve(__dirname, "../../transactions.csv"),
            path.resolve(__dirname, "../../../transactions.csv")
        ];
        let csvPath = candidates.find(p => fs.existsSync(p));
        if (!csvPath) return resolve([]);

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
                        payment_status: row.payment_status ? String(row.payment_status).trim().toUpperCase() : "SUCCESS"
                    });
                }
            })
            .on("end", () => {
                memoryTransactions = txns;
                resolve(memoryTransactions);
            })
            .on("error", () => resolve([]));
    });
}

/**
 * Retrieves transactions for a merchant.
 * Prioritizes MongoDB Atlas; falls back to in-memory CSV cache if DB is offline.
 */
async function fetchTransactions(merchantName, filterSuccessOnly = true) {
    if (mongoose.connection.readyState === 1) {
        try {
            const query = { merchant_name: merchantName };
            if (filterSuccessOnly) query.payment_status = "SUCCESS";
            const docs = await Transaction.find(query).sort({ date: 1 }).lean();
            if (docs.length > 0) return docs;
        } catch (e) {
            console.warn("[Analytics DB Query Fallback]:", e.message);
        }
    }

    if (memoryTransactions.length === 0) {
        await loadCsvToMemory();
    }
    return memoryTransactions.filter(t => {
        const matchName = t.merchant_name === merchantName;
        if (!filterSuccessOnly) return matchName;
        return matchName && (t.payment_status || "SUCCESS").toUpperCase() === "SUCCESS";
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculates primary dashboard KPIs (Today's Sales, Avg Previous Day, Day-over-Day change).
 */
async function getDashboardSummary(merchantName = "Sharma Café") {
    const transactions = await fetchTransactions(merchantName, true);

    if (transactions.length === 0) {
        return {
            merchantName,
            currentSales: 0,
            lastMonthSales: 0,
            salesChange: 0,
            transactions: 0,
            totalSales: 0,
            totalTransactions: 0,
            todaySales: 0,
            previousAverageSales: 0
        };
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

    let salesChange = 0;
    if (previousAverageSales > 0) {
        salesChange = ((currentSales - previousAverageSales) / previousAverageSales) * 100;
    } else if (currentSales > 0) {
        salesChange = 100;
    }

    const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
        merchantName,
        currentSales: Math.round(currentSales),
        todaySales: Math.round(currentSales),
        lastMonthSales: Math.round(previousAverageSales),
        previousAverageSales: Math.round(previousAverageSales),
        salesChange: Math.round(salesChange * 100) / 100,
        transactions: currentDayTransactions.length,
        todayTransactions: currentDayTransactions.length,
        totalSales: Math.round(totalSales),
        totalTransactions: transactions.length,
        latestDate
    };
}

/**
 * Calculates hourly sales for current day vs historical baseline.
 */
async function getHourlyAnalysis(merchantName = "Sharma Café") {
    const transactions = await fetchTransactions(merchantName, true);

    if (transactions.length === 0) {
        return { success: false, message: "No transaction data found", hourlyData: [] };
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

    return {
        success: true,
        merchantName,
        date: latestDate,
        hourlyData
    };
}

/**
 * Calculates Daytime vs Evening business breakdown.
 */
async function getBusinessHealth(merchantName = "Sharma Café") {
    const transactions = await fetchTransactions(merchantName, true);

    const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
    const eveningTransactions = transactions.filter(t => t.hour >= 18);
    const daytimeTransactions = transactions.filter(t => t.hour < 18);
    const eveningSales = eveningTransactions.reduce((sum, t) => sum + t.amount, 0);
    const daytimeSales = daytimeTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
        merchantName,
        totalTransactions: transactions.length,
        totalSales,
        daytimeSales,
        eveningSales,
        eveningTransactionCount: eveningTransactions.length,
        daytimeTransactionCount: daytimeTransactions.length
    };
}

/**
 * Checks if current hour transactions significantly deviate from baseline.
 */
async function getTriggerCheck(merchantName = "Sharma Café") {
    const transactions = await fetchTransactions(merchantName, true);

    if (transactions.length === 0) {
        return { success: false, message: "No transaction data found" };
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

    return {
        success: true,
        merchantName,
        currentDate: currentDateString,
        currentHour,
        currentTransactions: currentCount,
        historicalAverage: Math.round(historicalAverage * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        threshold,
        triggered
    };
}

/**
 * Identifies low-activity hours where sales dropped >= 20% below baseline.
 */
async function getOpportunity(merchantName = "Sharma Café") {
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

    return {
        success: true,
        merchantName,
        currentDate,
        threshold: `${threshold}%`,
        opportunityDetected: opportunities.length > 0,
        opportunities: opportunities.sort((a, b) => a.hour - b.hour)
    };
}

/**
 * Aggregates top selling categories / products for a merchant.
 */
async function getTopProducts(merchantName = "Sharma Café", limit = 5) {
    const transactions = await fetchTransactions(merchantName, true);
    const categoryTotals = {};

    transactions.forEach(t => {
        const cat = t.category || "General";
        if (!categoryTotals[cat]) {
            categoryTotals[cat] = { category: cat, totalSales: 0, orderCount: 0 };
        }
        categoryTotals[cat].totalSales += t.amount;
        categoryTotals[cat].orderCount += 1;
    });

    const sorted = Object.values(categoryTotals)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, limit);

    return {
        success: true,
        merchantName,
        topProducts: sorted
    };
}

/**
 * Returns latest transactions for a merchant.
 */
async function getRecentTransactions(merchantName = "Sharma Café", limit = 10) {
    if (mongoose.connection.readyState === 1) {
        try {
            const docs = await Transaction.find({ merchant_name: merchantName })
                .sort({ date: -1 })
                .limit(limit)
                .lean();
            return { success: true, count: docs.length, transactions: docs };
        } catch (_) {}
    }
    const all = await fetchTransactions(merchantName, false);
    const reversed = [...all].reverse().slice(0, limit);
    return { success: true, count: reversed.length, transactions: reversed };
}

module.exports = {
    loadCsvToMemory,
    fetchTransactions,
    getDashboardSummary,
    getHourlyAnalysis,
    getBusinessHealth,
    getTriggerCheck,
    getOpportunity,
    getTopProducts,
    getRecentTransactions
};
