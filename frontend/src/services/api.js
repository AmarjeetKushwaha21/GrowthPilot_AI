// ─── API Service Layer ───
// Centralized, resilient HTTP client communicating with the GrowthPilot AI backend.

/**
 * Normalizes the API base URL so /api is neither omitted nor duplicated,
 * while safely handling trailing slashes, empty strings, and production fallbacks.
 * 
 * @param {string} [raw] Optional override string
 * @returns {string} Normalized API base URL
 */
export function normalizeApiBaseUrl(raw) {
    let url = (raw !== undefined ? raw : (import.meta.env.VITE_API_BASE_URL || '')).trim();

    if (!url) {
        // In production build without explicit env var, default to the active deployed Render backend
        if (import.meta.env.PROD) {
            return 'https://growthpilot-ai-2-ofr7.onrender.com/api';
        }
        return '/api';
    }

    // Strip trailing slashes
    url = url.replace(/\/+$/, '');

    // If relative path like '/api'
    if (url === '/api') return '/api';

    // Ensure /api is at the end without duplicating
    return url.endsWith('/api') ? url : `${url}/api`;
}

export const API_BASE = normalizeApiBaseUrl();

/**
 * Performs a fetch with an AbortController timeout to prevent indefinite hangs
 * during Render cold starts or network drops.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timer);
        return response;
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            const timeoutError = new Error(`Request timed out after ${timeoutMs / 1000}s. The backend may be booting up from a cold start.`);
            timeoutError.isTimeout = true;
            throw timeoutError;
        }
        throw err;
    }
}

async function handleResponse(response) {
    if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
            const errData = await response.json();
            if (errData && errData.message) errorMsg = errData.message;
        } catch (_) {}
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

export const api = {
    // Health and Diagnostics
    async getHealth() {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/health`));
    },

    // Merchant Management
    async getMerchants() {
        const data = await handleResponse(await fetchWithTimeout(`${API_BASE}/merchants`));
        return data.merchants || ["Sharma Café", "Gupta Sweets", "FreshBite Corner"];
    },

    async getMerchantStats(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/merchant?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    // REST Dashboard Endpoints
    async getDashboardSummary(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/dashboard/summary?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getDashboardSales(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/dashboard/sales?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getTopProducts(merchantName, limit = 5) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/dashboard/top-products?merchant_name=${encodeURIComponent(merchantName)}&limit=${limit}`));
    },

    async getRecentTransactions(merchantName, limit = 10) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/dashboard/recent-transactions?merchant_name=${encodeURIComponent(merchantName)}&limit=${limit}`));
    },

    // Transaction Management
    async getTransactions(params = {}) {
        const search = new URLSearchParams(params).toString();
        return handleResponse(await fetchWithTimeout(`${API_BASE}/transactions${search ? `?${search}` : ''}`));
    },

    async getTransactionById(id) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/transactions/${encodeURIComponent(id)}`));
    },

    async createTransaction(payload) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }));
    },

    async updateTransaction(id, payload) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/transactions/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }));
    },

    async deleteTransaction(id) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/transactions/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        }));
    },

    async importTransactions() {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/import-transactions`, {
            method: 'POST'
        }));
    },

    // Customers
    async getCustomers(merchantName) {
        const query = merchantName ? `?merchant_name=${encodeURIComponent(merchantName)}` : '';
        return handleResponse(await fetchWithTimeout(`${API_BASE}/customers${query}`));
    },

    async getCustomerById(id) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/customers/${encodeURIComponent(id)}`));
    },

    // Insights & Business Intelligence
    async getInsights(merchantName) {
        const query = merchantName ? `?merchant_name=${encodeURIComponent(merchantName)}` : '';
        return handleResponse(await fetchWithTimeout(`${API_BASE}/insights${query}`));
    },

    async generateInsight(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/insights/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_name: merchantName })
        }));
    },

    async getAiBusinessAnalysis(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/ai-business-analysis?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getHourlyAnalysis(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/hourly-analysis?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getOpportunity(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/opportunity?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getGrowthRecommendations(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/ai-growth-recommendation?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    // Campaign & Action Execution
    async getCampaignStatus(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/status?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getCampaignResult(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/campaign-result?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async activateAction(payload) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }));
    },

    // Historical Intelligence
    async getHistoricalIntelligence(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/historical-intelligence?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    // Campaign History & Feedback
    async getCampaigns(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/campaigns?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async updateCampaignStatus(campaignId, status, merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, merchant_name: merchantName })
        }));
    },

    async submitCampaignFeedback(campaignId, rating, notes) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, notes })
        }));
    },

    // AI Growth Agent
    async runAgentCycle(merchantName) {
        return handleResponse(await fetchWithTimeout(`${API_BASE}/agent/cycle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_name: merchantName })
        }));
    }
};
