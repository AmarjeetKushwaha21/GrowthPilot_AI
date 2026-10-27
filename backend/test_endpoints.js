// ─── Automated Full-Stack REST API & Database Persistence Test Suite ───
const http = require('http');

// Start modular backend
require('./server.js');

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log("Waiting 2s for backend server to warm up...");
    await new Promise(r => setTimeout(r, 2000));

    const tests = [
        // System & Health
        { name: "Root endpoint", method: "GET", path: "/" },
        { name: "Health check", method: "GET", path: "/api/health" },
        { name: "Get merchants", method: "GET", path: "/api/merchants" },

        // Dashboard Endpoints
        { name: "Get status", method: "GET", path: "/api/status?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get merchant stats", method: "GET", path: "/api/merchant?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get dashboard summary", method: "GET", path: "/api/dashboard/summary?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get dashboard sales", method: "GET", path: "/api/dashboard/sales?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get top products", method: "GET", path: "/api/dashboard/top-products?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get recent transactions", method: "GET", path: "/api/dashboard/recent-transactions?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get business health", method: "GET", path: "/api/business-health?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get hourly analysis", method: "GET", path: "/api/hourly-analysis?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get trigger check", method: "GET", path: "/api/trigger-check?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get opportunity", method: "GET", path: "/api/opportunity?merchant_name=Sharma%20Caf%C3%A9" },

        // Transactions CRUD & Customers
        { name: "Get transactions list", method: "GET", path: "/api/transactions?merchant_name=Sharma%20Caf%C3%A9&limit=5" },
        { name: "Get customers", method: "GET", path: "/api/customers?merchant_name=Sharma%20Caf%C3%A9" },

        // Insights & AI
        { name: "Get insights", method: "GET", path: "/api/insights?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Generate insight", method: "POST", path: "/api/insights/generate", body: { merchant_name: "Sharma Café" } },
        { name: "Get AI business analysis", method: "GET", path: "/api/ai-business-analysis?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get AI growth recommendations", method: "GET", path: "/api/ai-growth-recommendation?merchant_name=Sharma%20Caf%C3%A9" },

        // Campaigns & Action Execution
        { name: "Post Action activation", method: "POST", path: "/api/action", body: { merchant_name: "Sharma Café", type: "Test Combo", discount: 15 } },
        { name: "Get campaign result", method: "GET", path: "/api/campaign-result?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get Historical Intelligence", method: "GET", path: "/api/historical-intelligence?merchant_name=Sharma%20Caf%C3%A9" },
        { name: "Get Campaigns", method: "GET", path: "/api/campaigns?merchant_name=Sharma%20Caf%C3%A9" },

        // CSV Sync & AI Agent Coordinator
        { name: "Import Transactions CSV", method: "POST", path: "/api/import-transactions" },
        { name: "Run AI Growth Agent Cycle", method: "POST", path: "/api/agent/cycle", body: { merchant_name: "Sharma Café" } }
    ];

    let passed = 0;
    let failed = 0;

    for (const t of tests) {
        try {
            const res = await makeRequest(t.method, t.path, t.body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`[PASS] ${t.method} ${t.path} (Status ${res.statusCode})`);
                passed++;
            } else {
                console.error(`[FAIL] ${t.method} ${t.path} (Status ${res.statusCode})`, res.body);
                failed++;
            }
        } catch (err) {
            console.error(`[ERROR] ${t.method} ${t.path}:`, err.message);
            failed++;
        }
    }

    // Dynamic Transaction Lifecycle: CREATE -> GET -> UPDATE -> DELETE
    const testTxnId = `TXN-TEST-${Date.now()}`;
    try {
        console.log(`\nTesting Transaction Lifecycle for ${testTxnId}...`);
        // 1. Create
        const createRes = await makeRequest("POST", "/api/transactions", {
            transaction_id: testTxnId,
            merchant_name: "Sharma Café",
            amount: 250,
            category: "Coffee",
            payment_status: "SUCCESS"
        });
        if (createRes.statusCode === 201) {
            console.log(`[PASS] POST /api/transactions (Created ${testTxnId})`);
            passed++;
        } else {
            console.error(`[FAIL] POST /api/transactions`, createRes.body);
            failed++;
        }

        // 2. Read
        const getRes = await makeRequest("GET", `/api/transactions/${testTxnId}`);
        if (getRes.statusCode === 200 && getRes.body.transaction?.transaction_id === testTxnId) {
            console.log(`[PASS] GET /api/transactions/:id (Persisted in DB verified)`);
            passed++;
        } else {
            console.error(`[FAIL] GET /api/transactions/:id`, getRes.body);
            failed++;
        }

        // 3. Update
        const updateRes = await makeRequest("PATCH", `/api/transactions/${testTxnId}`, { amount: 300 });
        if (updateRes.statusCode === 200 && updateRes.body.transaction?.amount === 300) {
            console.log(`[PASS] PATCH /api/transactions/:id (Updated amount to 300)`);
            passed++;
        } else {
            console.error(`[FAIL] PATCH /api/transactions/:id`, updateRes.body);
            failed++;
        }

        // 4. Delete
        const deleteRes = await makeRequest("DELETE", `/api/transactions/${testTxnId}`);
        if (deleteRes.statusCode === 200) {
            console.log(`[PASS] DELETE /api/transactions/:id (Cleaned up test record)`);
            passed++;
        } else {
            console.error(`[FAIL] DELETE /api/transactions/:id`, deleteRes.body);
            failed++;
        }
    } catch (lifecycleErr) {
        console.error(`[ERROR] Transaction Lifecycle:`, lifecycleErr.message);
        failed++;
    }

    // Test campaign feedback
    try {
        const feedbackRes = await makeRequest("POST", "/api/campaigns/CMP-SHARMACAFE-001/feedback", { rating: 5, notes: "Excellent sales boost" });
        if (feedbackRes.statusCode === 200) {
            console.log(`[PASS] POST /api/campaigns/:id/feedback (Status 200)`);
            passed++;
        } else {
            console.error(`[FAIL] POST feedback`, feedbackRes);
            failed++;
        }
    } catch (e) {
        console.error(`[ERROR] Feedback:`, e.message);
        failed++;
    }

    console.log(`\n============================`);
    console.log(`Endpoint Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`============================\n`);

    process.exit(failed === 0 ? 0 : 1);
}

runTests();
