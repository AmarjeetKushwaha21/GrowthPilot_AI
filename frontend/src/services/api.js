// ─── API Service Layer ───
// Centralized, resilient HTTP client communicating with the backend.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function handleResponse(response) {
    if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
            const errData = await response.json();
            if (errData && errData.message) errorMsg = errData.message;
        } catch (_) {}
        throw new Error(errorMsg);
    }
    return response.json();
}

export const api = {
    // Merchant Management
    async getMerchants() {
        try {
            const data = await handleResponse(await fetch(`${API_BASE}/merchants`));
            return data.merchants || ["Sharma Café", "Gupta Sweets", "FreshBite Corner"];
        } catch (e) {
            console.warn("Failed to fetch merchants, using defaults:", e.message);
            return ["Sharma Café", "Gupta Sweets", "FreshBite Corner"];
        }
    },

    async getMerchantStats(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/merchant?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    // AI & Business Intelligence
    async getAiBusinessAnalysis(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/ai-business-analysis?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getHourlyAnalysis(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/hourly-analysis?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getOpportunity(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/opportunity?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getGrowthRecommendations(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/ai-growth-recommendation?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    // Campaign & Action Execution
    async getCampaignStatus(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/status?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async getCampaignResult(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/campaign-result?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async activateAction(payload) {
        return handleResponse(await fetch(`${API_BASE}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }));
    },

    // Historical Intelligence
    async getHistoricalIntelligence(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/historical-intelligence?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    // Campaign History & Feedback
    async getCampaigns(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/campaigns?merchant_name=${encodeURIComponent(merchantName)}`));
    },

    async updateCampaignStatus(campaignId, status, merchantName) {
        return handleResponse(await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, merchant_name: merchantName })
        }));
    },

    async submitCampaignFeedback(campaignId, rating, notes) {
        return handleResponse(await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, notes })
        }));
    },

    // AI Growth Agent
    async runAgentCycle(merchantName) {
        return handleResponse(await fetch(`${API_BASE}/agent/cycle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_name: merchantName })
        }));
    }
};
