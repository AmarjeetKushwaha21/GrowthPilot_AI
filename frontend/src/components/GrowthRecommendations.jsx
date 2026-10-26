import React from 'react';
import { Lightbulb, AlertTriangle, ArrowDown } from 'lucide-react';

export default function GrowthRecommendations({
    opportunity,
    recommendations,
    loading,
    selectedRec,
    onActivate,
    actionStatus
}) {
    return (
        <section id="growth-actions" className="card">
            <span className="card-label ai">AI-POWERED RECOMMENDATIONS</span>
            <div className="section-header">
                <h2>
                    <Lightbulb size={18} />
                    Growth Options
                </h2>
            </div>

            {/* Opportunity Banner */}
            {opportunity && (
                <div className="opportunity-banner" id="opportunityBanner">
                    <div className="opp-icon">
                        <AlertTriangle size={17} />
                    </div>
                    <div className="opp-text" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                            <strong id="oppTitle" style={{ marginBottom: 0 }}>Opportunity Detected</strong>
                            <span className="target-window-badge" id="oppTargetWindow">
                                Target window: {String(opportunity.hour).padStart(2, '0')}:00–{String((opportunity.hour + 1) % 24).padStart(2, '0')}:00
                            </span>
                        </div>
                        <span id="oppDescription" style={{ display: 'block', fontSize: '13px', color: '#a16207', lineHeight: '1.5' }}>
                            Sales are {Math.abs(opportunity.deviation)}% below the historical baseline during {String(opportunity.hour).padStart(2, '0')}:00–{String((opportunity.hour + 1) % 24).padStart(2, '0')}:00. Current: ₹{opportunity.currentValue} vs baseline ₹{opportunity.baseline}.
                        </span>
                        <p style={{ fontSize: '11.5px', color: '#92400e', marginTop: '8px', fontWeight: 500, opacity: 0.9 }}>
                            Note: Overall performance can be positive while specific time windows still show growth opportunities.
                        </p>
                    </div>
                </div>
            )}

            {/* 3 Recommendation Cards */}
            <div id="recommendationCards">
                {loading ? (
                    <div className="rec-loading">
                        <div className="spinner"></div>
                        <p>Sarvam AI is generating growth options…</p>
                    </div>
                ) : recommendations && recommendations.length > 0 ? (
                    <div className="recommendations-grid">
                        {recommendations.map((rec, index) => {
                            const isSelected = selectedRec && (selectedRec.id === rec.id || selectedRec.action === rec.action);
                            return (
                                <div
                                    key={rec.id || index}
                                    className={`recommendation-card ${isSelected ? 'selected' : ''}`}
                                >
                                    <div className="rec-number">{index + 1}</div>
                                    <div className="rec-title">{rec.action || 'Growth Action'}</div>
                                    <div className="rec-desc">{rec.description || ''}</div>

                                    {rec.discount ? (
                                        <div className="rec-discount">
                                            <ArrowDown size={12} />
                                            {rec.discount}% discount
                                        </div>
                                    ) : null}

                                    {rec.supporting_evidence && (
                                        <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px' }}>
                                            <strong>Evidence:</strong> {rec.supporting_evidence.historical_reference || 'Opportunity-matched'}
                                        </div>
                                    )}

                                    <button
                                        className="rec-activate-btn"
                                        disabled={isSelected}
                                        onClick={() => onActivate(rec)}
                                        type="button"
                                    >
                                        {isSelected ? '✓ Activated' : 'Activate This'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rec-loading" style={{ color: '#475569' }}>
                        <p>No recommendations available right now. GrowthPilot AI will keep monitoring.</p>
                    </div>
                )}
            </div>

            {actionStatus && <p id="actionStatus">{actionStatus}</p>}
        </section>
    );
}
