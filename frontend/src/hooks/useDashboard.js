import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useDashboard() {
    const [merchants, setMerchants] = useState(["Sharma Café", "Gupta Sweets", "FreshBite Corner"]);
    const [currentMerchant, setCurrentMerchant] = useState("Sharma Café");

    // Dashboard Data
    const [stats, setStats] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [hourlyData, setHourlyData] = useState([]);
    const [opportunity, setOpportunity] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [selectedRecommendation, setSelectedRecommendation] = useState(null);
    const [actionStatus, setActionStatus] = useState('');

    // Performance Monitor
    const [performanceVisible, setPerformanceVisible] = useState(false);
    const [campaignStatus, setCampaignStatus] = useState('—');
    const [campaignName, setCampaignName] = useState('—');
    const [projectedSales, setProjectedSales] = useState(null);
    const [salesUplift, setSalesUplift] = useState(null);

    // Flow Pipeline
    const [flowStep, setFlowStep] = useState('recommend');

    // Activity Log
    const [activatedAction, setActivatedAction] = useState(null);

    // Historical Intelligence & Campaigns
    const [historicalIntel, setHistoricalIntel] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [agentState, setAgentState] = useState(null);

    // Loading States
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingHourly, setLoadingHourly] = useState(false);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [loadingIntel, setLoadingIntel] = useState(false);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [loadingAgent, setLoadingAgent] = useState(false);

    // Load available merchants on mount
    useEffect(() => {
        api.getMerchants().then(list => {
            if (list && list.length > 0) setMerchants(list);
        }).catch(() => {});
    }, []);

    // Load full dashboard for selected merchant
    const loadDashboardData = useCallback(async (merchantName) => {
        // Reset state for new merchant
        setSelectedRecommendation(null);
        setPerformanceVisible(false);
        setProjectedSales(null);
        setSalesUplift(null);
        setActivatedAction(null);
        setActionStatus('');
        setFlowStep('recommend');

        // 1. Stats
        setLoadingStats(true);
        api.getMerchantStats(merchantName)
            .then(data => setStats(data))
            .catch(err => console.error("Merchant Stats Error:", err))
            .finally(() => setLoadingStats(false));

        // 2. AI Business Analysis
        setLoadingAnalysis(true);
        api.getAiBusinessAnalysis(merchantName)
            .then(data => {
                if (data.success && data.aiAnalysis) {
                    setAiAnalysis(data.aiAnalysis);
                }
            })
            .catch(err => console.error("AI Analysis Error:", err))
            .finally(() => setLoadingAnalysis(false));

        // 3. Hourly Chart
        setLoadingHourly(true);
        api.getHourlyAnalysis(merchantName)
            .then(data => {
                if (data.success && data.hourlyData) {
                    setHourlyData(data.hourlyData);
                }
            })
            .catch(err => console.error("Hourly Analysis Error:", err))
            .finally(() => setLoadingHourly(false));

        // 4. Recommendations & Opportunity
        setLoadingRecs(true);
        api.getGrowthRecommendations(merchantName)
            .then(data => {
                if (data.success) {
                    setOpportunity(data.opportunity || null);
                    setRecommendations(data.recommendations || []);
                }
            })
            .catch(err => console.error("Recommendations Error:", err))
            .finally(() => setLoadingRecs(false));

        // 5. Existing Campaign Status check
        api.getCampaignStatus(merchantName)
            .then(data => {
                if (data.campaignStatus === "Activated") {
                    setPerformanceVisible(true);
                    setCampaignStatus("Activated");
                    setCampaignName(data.latestAction?.type || "Growth Action");
                    setFlowStep("measure");
                }
            })
            .catch(() => {});

        // 6. Historical Intelligence
        setLoadingIntel(true);
        api.getHistoricalIntelligence(merchantName)
            .then(data => setHistoricalIntel(data))
            .catch(err => console.error("Historical Intel Error:", err))
            .finally(() => setLoadingIntel(false));

        // 7. Campaign History
        setLoadingCampaigns(true);
        api.getCampaigns(merchantName)
            .then(data => {
                if (data.success && data.campaigns) {
                    setCampaigns(data.campaigns);
                }
            })
            .catch(err => console.error("Campaign History Error:", err))
            .finally(() => setLoadingCampaigns(false));

    }, []);

    useEffect(() => {
        loadDashboardData(currentMerchant);
    }, [currentMerchant, loadDashboardData]);

    // Activate Recommendation
    const activateRecommendation = async (rec) => {
        setSelectedRecommendation(rec);
        setActionStatus(`${rec.action || rec.title} activated. Monitoring performance…`);
        setActivatedAction(rec);
        setPerformanceVisible(true);
        setCampaignStatus("Campaign Activated");
        setCampaignName(rec.action || rec.title);
        setFlowStep("execute");

        // Simulate multi-stage progression matching legacy demo
        setTimeout(() => {
            setCampaignStatus("Monitoring performance…");
            setFlowStep("measure");

            setTimeout(() => {
                setCampaignStatus("Results Available");
                setFlowStep("grow");
            }, 2500);
        }, 1500);

        try {
            const result = await api.activateAction({
                merchant_name: currentMerchant,
                type: rec.action || rec.title,
                discount: rec.discount || 0,
                status: "approved",
                id: rec.id
            });
            setActionStatus(result.message || 'Campaign activated successfully.');

            // Fetch simulated campaign result
            const resData = await api.getCampaignResult(currentMerchant);
            if (resData.success && resData.result) {
                setProjectedSales(resData.result.currentSales);
                setSalesUplift(resData.result.salesUplift);
            }

            // Refresh campaign list
            const updatedCamps = await api.getCampaigns(currentMerchant);
            if (updatedCamps.success) {
                setCampaigns(updatedCamps.campaigns);
            }
        } catch (e) {
            console.error("Activate Action Error:", e);
            setActionStatus("Campaign activation failed.");
        }
    };

    // Run AI Growth Agent Cycle
    const runAgentCycle = async () => {
        setLoadingAgent(true);
        try {
            const data = await api.runAgentCycle(currentMerchant);
            if (data.success && data.agentState) {
                setAgentState(data.agentState);
            }
        } catch (e) {
            console.error("Agent Cycle Error:", e);
        } finally {
            setLoadingAgent(false);
        }
    };

    // Agent Actions
    const approveAgentCampaign = async (campaign) => {
        await api.updateCampaignStatus(campaign.campaign_id, 'approved', currentMerchant);
        await activateRecommendation(campaign);
        if (agentState) {
            setAgentState(prev => ({
                ...prev,
                recommendation: { ...prev.recommendation, status: 'approved' }
            }));
        }
    };

    const rejectAgentCampaign = async (campaign) => {
        await api.updateCampaignStatus(campaign.campaign_id, 'rejected', currentMerchant);
        if (agentState) {
            setAgentState(prev => ({
                ...prev,
                recommendation: { ...prev.recommendation, status: 'rejected' }
            }));
        }
        // Refresh campaign history
        const updated = await api.getCampaigns(currentMerchant);
        if (updated.success) setCampaigns(updated.campaigns);
    };

    const editAndApproveAgentCampaign = async (campaign) => {
        await api.updateCampaignStatus(campaign.campaign_id, 'approved', currentMerchant);
        await activateRecommendation(campaign);
        if (agentState) {
            setAgentState(prev => ({
                ...prev,
                recommendation: { ...campaign, status: 'approved' }
            }));
        }
    };

    // Submit Merchant Review / Feedback
    const submitFeedback = async (campaignId, rating, notes) => {
        await api.submitCampaignFeedback(campaignId, rating, notes);
        const updated = await api.getCampaigns(currentMerchant);
        if (updated.success) setCampaigns(updated.campaigns);
    };

    return {
        merchants,
        currentMerchant,
        setCurrentMerchant,
        stats,
        loadingStats,
        aiAnalysis,
        loadingAnalysis,
        hourlyData,
        loadingHourly,
        opportunity,
        recommendations,
        loadingRecs,
        selectedRecommendation,
        activateRecommendation,
        actionStatus,
        performanceVisible,
        campaignStatus,
        campaignName,
        projectedSales,
        salesUplift,
        flowStep,
        activatedAction,
        historicalIntel,
        loadingIntel,
        campaigns,
        loadingCampaigns,
        submitFeedback,
        agentState,
        loadingAgent,
        runAgentCycle,
        approveAgentCampaign,
        rejectAgentCampaign,
        editAndApproveAgentCampaign
    };
}
