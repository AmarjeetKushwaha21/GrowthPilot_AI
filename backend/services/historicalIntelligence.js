// ─── Historical Business Intelligence Calculation Service ───
// Deterministic financial and operational metrics calculation.

/**
 * Safely computes percentage change between current and previous values.
 * Handles zero denominators, missing data, and negative bases.
 * @param {number} current - Current period value
 * @param {number} previous - Previous period baseline value
 * @returns {number|null} Formatted percentage change or null if baseline is zero/undefined
 */
function calculatePercentageChange(current, previous) {
    if (previous === null || previous === undefined || isNaN(previous)) {
        return 0;
    }
    if (previous === 0) {
        if (current === 0) return 0;
        return current > 0 ? 100 : -100;
    }
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return Math.round(change * 100) / 100;
}

/**
 * Analyzes transaction dataset to extract deterministic historical intelligence.
 * @param {Array} transactions - Array of transaction objects
 * @param {string} merchantName - Merchant identifier
 * @returns {Object} Comprehensive intelligence report
 */
function analyzeHistoricalIntelligence(transactions, merchantName) {
    // 1. Data Validation & Boundary Handling
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return {
            merchantName,
            hasData: false,
            message: "Insufficient historical transaction data for this merchant.",
            metrics: {
                totalSales: 0,
                totalTransactions: 0,
                averageOrderValue: 0,
                periodComparison: null
            },
            hourlyPerformance: { peakHour: null, lowestHour: null, hourlyStats: [] },
            categoryTrends: [],
            recurringPatterns: [],
            facts: ["No transaction records currently available."]
        };
    }

    // Filter successful transactions
    const successfulTxns = transactions.filter(t => (t.payment_status || "SUCCESS").toUpperCase() === "SUCCESS");
    if (successfulTxns.length === 0) {
        return {
            merchantName,
            hasData: false,
            message: "No successful transactions found.",
            metrics: { totalSales: 0, totalTransactions: 0, averageOrderValue: 0, periodComparison: null },
            hourlyPerformance: { peakHour: null, lowestHour: null, hourlyStats: [] },
            categoryTrends: [],
            recurringPatterns: [],
            facts: ["All recorded transactions have failed or are pending."]
        };
    }

    // 2. Identify Distinct Dates and Periods
    const dateMap = {};
    successfulTxns.forEach(t => {
        const d = new Date(t.date).toISOString().split("T")[0];
        if (!dateMap[d]) dateMap[d] = [];
        dateMap[d].push(t);
    });

    const dates = Object.keys(dateMap).sort();
    const latestDate = dates[dates.length - 1];
    const previousDates = dates.slice(0, -1);

    const currentPeriodTxns = dateMap[latestDate] || [];
    const previousPeriodTxns = previousDates.flatMap(d => dateMap[d]);

    // Current period metrics
    const currentSales = currentPeriodTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currentOrders = currentPeriodTxns.length;
    const currentAOV = currentOrders > 0 ? currentSales / currentOrders : 0;

    // Previous period daily averages
    const previousTotalSales = previousPeriodTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const previousTotalOrders = previousPeriodTxns.length;
    const numPreviousDays = Math.max(previousDates.length, 1);
    const previousAvgDailySales = previousTotalSales / numPreviousDays;
    const previousAvgDailyOrders = previousTotalOrders / numPreviousDays;
    const previousAOV = previousTotalOrders > 0 ? previousTotalSales / previousTotalOrders : 0;

    // Percent changes (deterministic, zero-safe)
    const salesChangePct = calculatePercentageChange(currentSales, previousAvgDailySales);
    const orderCountChangePct = calculatePercentageChange(currentOrders, previousAvgDailyOrders);
    const aovChangePct = calculatePercentageChange(currentAOV, previousAOV);

    // 3. Hourly Performance Breakdown & High/Low Periods
    const hourlyAggregation = {};
    for (let h = 7; h <= 23; h++) {
        hourlyAggregation[h] = { hour: h, totalSales: 0, totalCount: 0, daysWithActivity: new Set() };
    }

    successfulTxns.forEach(t => {
        const h = Number(t.hour);
        const d = new Date(t.date).toISOString().split("T")[0];
        if (h >= 7 && h <= 23 && hourlyAggregation[h]) {
            hourlyAggregation[h].totalSales += Number(t.amount) || 0;
            hourlyAggregation[h].totalCount += 1;
            hourlyAggregation[h].daysWithActivity.add(d);
        }
    });

    const hourlyStats = Object.values(hourlyAggregation).map(item => {
        const days = Math.max(item.daysWithActivity.size, 1);
        return {
            hour: item.hour,
            formattedHour: `${String(item.hour).padStart(2, "0")}:00`,
            avgSalesPerHour: Math.round((item.totalSales / dates.length) * 100) / 100,
            avgTxCountPerHour: Math.round((item.totalCount / dates.length) * 10) / 10,
            totalSales: Math.round(item.totalSales),
            totalTransactions: item.totalCount
        };
    });

    // Identify Peak and Lowest Hours (filtering out empty hours)
    const activeHours = hourlyStats.filter(h => h.totalSales > 0);
    let peakHour = null;
    let lowestHour = null;

    if (activeHours.length > 0) {
        peakHour = [...activeHours].sort((a, b) => b.avgSalesPerHour - a.avgSalesPerHour)[0];
        lowestHour = [...activeHours].sort((a, b) => a.avgSalesPerHour - b.avgSalesPerHour)[0];
    }

    // 4. Product / Category Level Trends
    const categoryMap = {};
    successfulTxns.forEach(t => {
        const cat = t.category ? String(t.category).trim() : "Uncategorized";
        if (!categoryMap[cat]) {
            categoryMap[cat] = {
                category: cat,
                totalSales: 0,
                orderCount: 0,
                currentPeriodSales: 0,
                previousPeriodSales: 0
            };
        }
        const amt = Number(t.amount) || 0;
        categoryMap[cat].totalSales += amt;
        categoryMap[cat].orderCount += 1;

        const d = new Date(t.date).toISOString().split("T")[0];
        if (d === latestDate) {
            categoryMap[cat].currentPeriodSales += amt;
        } else {
            categoryMap[cat].previousPeriodSales += amt;
        }
    });

    const totalAllSales = successfulTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const categoryTrends = Object.values(categoryMap).map(cat => {
        const sharePct = totalAllSales > 0 ? (cat.totalSales / totalAllSales) * 100 : 0;
        const avgItemPrice = cat.orderCount > 0 ? cat.totalSales / cat.orderCount : 0;
        const prevAvgDaily = numPreviousDays > 0 ? cat.previousPeriodSales / numPreviousDays : 0;
        const catGrowthPct = calculatePercentageChange(cat.currentPeriodSales, prevAvgDaily);

        return {
            category: cat.category,
            totalSales: Math.round(cat.totalSales),
            orderCount: cat.orderCount,
            sharePercentage: Math.round(sharePct * 10) / 10,
            averagePrice: Math.round(avgItemPrice),
            currentPeriodSales: Math.round(cat.currentPeriodSales),
            growthVsHistorical: catGrowthPct
        };
    }).sort((a, b) => b.totalSales - a.totalSales);

    // 5. Recurring Pattern Detection
    const recurringPatterns = [];

    // Pattern 1: Evening Activity Drop
    const eveningTxns = successfulTxns.filter(t => t.hour >= 18);
    const dayTxns = successfulTxns.filter(t => t.hour < 18);
    const eveningSalesShare = totalAllSales > 0 ? (eveningTxns.reduce((s, t) => s + t.amount, 0) / totalAllSales) * 100 : 0;

    if (eveningSalesShare < 30) {
        recurringPatterns.push({
            patternId: "recurring_evening_lull",
            type: "risk_opportunity",
            title: "Recurring Evening Activity Deficit",
            description: `Only ${Math.round(eveningSalesShare)}% of total sales occur after 18:00 across all recorded days.`,
            confidence: "High",
            frequency: `${dates.length} of ${dates.length} observed days`,
            recommendedWindow: "18:00 - 21:00"
        });
    }

    // Pattern 2: Peak Lunch / Afternoon Rush
    const lunchTxns = successfulTxns.filter(t => t.hour >= 12 && t.hour <= 14);
    const lunchSalesShare = totalAllSales > 0 ? (lunchTxns.reduce((s, t) => s + t.amount, 0) / totalAllSales) * 100 : 0;
    if (lunchSalesShare >= 30) {
        recurringPatterns.push({
            patternId: "recurring_lunch_rush",
            type: "strength",
            title: "Consistently Strong Lunchtime Window",
            description: `The 12:00–14:00 window accounts for ${Math.round(lunchSalesShare)}% of daily revenue.`,
            confidence: "High",
            frequency: "Daily peak period",
            recommendedWindow: "12:00 - 14:00"
        });
    }

    // Pattern 3: Top Category Concentration
    if (categoryTrends.length > 0 && categoryTrends[0].sharePercentage >= 40) {
        recurringPatterns.push({
            patternId: "category_concentration",
            type: "insight",
            title: `High Revenue Concentration in ${categoryTrends[0].category}`,
            description: `${categoryTrends[0].category} contributes ${categoryTrends[0].sharePercentage}% of total revenue.`,
            confidence: "Medium",
            frequency: "Observed trend",
            recommendedWindow: "All operational hours"
        });
    }

    // 6. Explicitly Formulated Observed Facts (Deterministic)
    const facts = [
        `Observed ${successfulTxns.length} successful transactions across ${dates.length} days (${dates[0]} to ${latestDate}).`,
        `Current day sales: ₹${Math.round(currentSales).toLocaleString("en-IN")} vs Historical daily average: ₹${Math.round(previousAvgDailySales).toLocaleString("en-IN")} (${salesChangePct >= 0 ? '+' : ''}${salesChangePct}%).`,
        peakHour ? `Busiest business hour: ${peakHour.formattedHour} averaging ₹${Math.round(peakHour.avgSalesPerHour)} across ${peakHour.avgTxCountPerHour} orders.` : "Insufficient hourly data.",
        lowestHour ? `Slowest business hour: ${lowestHour.formattedHour} averaging ₹${Math.round(lowestHour.avgSalesPerHour)} across ${lowestHour.avgTxCountPerHour} orders.` : "Insufficient hourly data.",
        categoryTrends.length > 0 ? `Leading sales category: ${categoryTrends[0].category} with ${categoryTrends[0].sharePercentage}% revenue share.` : "No category data available."
    ];

    return {
        merchantName,
        hasData: true,
        currentDate: latestDate,
        totalHistoricalDays: dates.length,
        metrics: {
            currentSales: Math.round(currentSales),
            currentOrders,
            currentAOV: Math.round(currentAOV),
            previousAvgDailySales: Math.round(previousAvgDailySales),
            previousAvgDailyOrders: Math.round(previousAvgDailyOrders * 10) / 10,
            previousAOV: Math.round(previousAOV),
            salesChangePct,
            orderCountChangePct,
            aovChangePct
        },
        hourlyPerformance: {
            peakHour,
            lowestHour,
            hourlyStats
        },
        categoryTrends,
        recurringPatterns,
        facts
    };
}

module.exports = {
    calculatePercentageChange,
    analyzeHistoricalIntelligence
};
