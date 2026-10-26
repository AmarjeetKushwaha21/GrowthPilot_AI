import React from 'react';
import { Activity } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function PerformanceMonitor({
    visible,
    campaignStatus,
    campaignName,
    projectedSales,
    salesUplift
}) {
    if (!visible) return null;

    return (
        <section className="card" id="performance">
            <span className="card-label">CAMPAIGN RESULTS</span>
            <div className="section-header">
                <h2>
                    <Activity size={18} />
                    Campaign Performance
                    <span className="performance-badge">Simulated</span>
                </h2>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                Tracking the projected impact of your activated growth action.
            </p>

            <div className="performance-grid">
                <div className="performance-result">
                    <p>Campaign Status</p>
                    <h3 id="campaignStatus">{campaignStatus || '—'}</h3>
                </div>

                <div className="performance-result">
                    <p>Growth Action</p>
                    <h3 id="campaignName">{campaignName || '—'}</h3>
                </div>

                {projectedSales !== null && projectedSales !== undefined && (
                    <div className="performance-result" id="salesResult">
                        <p>Projected Sales (Simulated)</p>
                        <h3 id="salesAfterCampaign">{formatCurrency(projectedSales)}</h3>
                    </div>
                )}

                {salesUplift !== null && salesUplift !== undefined && (
                    <div className="performance-result" id="upliftResult">
                        <p>Estimated Uplift</p>
                        <h3 id="salesUplift" className="uplift">+{salesUplift}%</h3>
                    </div>
                )}
            </div>
        </section>
    );
}
