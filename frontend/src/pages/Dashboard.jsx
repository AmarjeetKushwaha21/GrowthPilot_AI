import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import WelcomeCard from '../components/WelcomeCard';
import StatsGrid from '../components/StatsGrid';
import BusinessHealth from '../components/BusinessHealth';
import HourlyChart from '../components/HourlyChart';
import FlowIndicator from '../components/FlowIndicator';
import GrowthRecommendations from '../components/GrowthRecommendations';
import PerformanceMonitor from '../components/PerformanceMonitor';
import ActivityTimeline from '../components/ActivityTimeline';
import HistoricalIntelligence from '../components/HistoricalIntelligence';
import CampaignHistory from '../components/CampaignHistory';
import AIGrowthAgent from '../components/AIGrowthAgent';
import { useDashboard } from '../hooks/useDashboard';

export default function Dashboard() {
    const [activeSection, setActiveSection] = useState('dashboard');
    const dashboard = useDashboard();

    return (
        <div className="app-container">
            {/* Sidebar Navigation */}
            <Sidebar
                activeSection={activeSection}
                onSelectSection={setActiveSection}
            />

            {/* Header Topbar */}
            <Topbar
                currentMerchant={dashboard.currentMerchant}
                merchants={dashboard.merchants}
                onSelectMerchant={dashboard.setCurrentMerchant}
            />

            {/* Dashboard Main Content */}
            <main>
                {/* 1. Welcome Greeting Card */}
                <WelcomeCard merchantName={dashboard.currentMerchant} />

                {/* 2. Key Performance Indicators (KPIs) */}
                <StatsGrid
                    stats={dashboard.stats}
                    loading={dashboard.loadingStats}
                />

                {/* 3. AI Business Intelligence Summary */}
                <BusinessHealth
                    analysisText={dashboard.aiAnalysis}
                    loading={dashboard.loadingAnalysis}
                />

                {/* 4. Hourly Sales Performance Line Chart */}
                <HourlyChart
                    hourlyData={dashboard.hourlyData}
                    loading={dashboard.loadingHourly}
                />

                {/* 5. 6-Stage Workflow Pipeline */}
                <FlowIndicator currentStep={dashboard.flowStep} />

                {/* 6. Growth Recommendations & Opportunity Banner */}
                <GrowthRecommendations
                    opportunity={dashboard.opportunity}
                    recommendations={dashboard.recommendations}
                    loading={dashboard.loadingRecs}
                    selectedRec={dashboard.selectedRecommendation}
                    onActivate={dashboard.activateRecommendation}
                    actionStatus={dashboard.actionStatus}
                />

                {/* 7. Performance Monitor (Simulated Uplift) */}
                <PerformanceMonitor
                    visible={dashboard.performanceVisible}
                    campaignStatus={dashboard.campaignStatus}
                    campaignName={dashboard.campaignName}
                    projectedSales={dashboard.projectedSales}
                    salesUplift={dashboard.salesUplift}
                />

                {/* 8. AI Growth Agent Coordinator */}
                <AIGrowthAgent
                    merchantName={dashboard.currentMerchant}
                    agentState={dashboard.agentState}
                    loading={dashboard.loadingAgent}
                    onRunCycle={dashboard.runAgentCycle}
                    onApprove={dashboard.approveAgentCampaign}
                    onReject={dashboard.rejectAgentCampaign}
                    onEditAndApprove={dashboard.editAndApproveAgentCampaign}
                />

                {/* 9. Historical Business Intelligence & Category Trends */}
                <HistoricalIntelligence
                    data={dashboard.historicalIntel}
                    loading={dashboard.loadingIntel}
                />

                {/* 10. Campaign History & Learned Outcomes */}
                <CampaignHistory
                    campaigns={dashboard.campaigns}
                    loading={dashboard.loadingCampaigns}
                    onSubmitFeedback={dashboard.submitFeedback}
                />

                {/* 11. Activity Event Log */}
                <ActivityTimeline
                    recommendationsCount={dashboard.recommendations?.length}
                    activatedAction={dashboard.activatedAction}
                />
            </main>
        </div>
    );
}
