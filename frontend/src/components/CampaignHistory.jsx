import React, { useState } from 'react';
import { BookOpen, Star, MessageSquare, Check, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function CampaignHistory({
    campaigns,
    loading,
    onSubmitFeedback
}) {
    const [submittingId, setSubmittingId] = useState(null);
    const [ratings, setRatings] = useState({});
    const [notes, setNotes] = useState({});
    const [feedbackSuccess, setFeedbackSuccess] = useState({});

    const handleRatingClick = (campaignId, star) => {
        setRatings(prev => ({ ...prev, [campaignId]: star }));
    };

    const handleNoteChange = (campaignId, text) => {
        setNotes(prev => ({ ...prev, [campaignId]: text }));
    };

    const handleSubmit = async (campaignId) => {
        const rating = ratings[campaignId] || 5;
        const note = notes[campaignId] || '';
        setSubmittingId(campaignId);
        try {
            await onSubmitFeedback(campaignId, rating, note);
            setFeedbackSuccess(prev => ({ ...prev, [campaignId]: true }));
            setTimeout(() => {
                setFeedbackSuccess(prev => ({ ...prev, [campaignId]: false }));
            }, 3000);
        } catch (e) {
            console.error("Feedback submission error:", e);
        } finally {
            setSubmittingId(null);
        }
    };

    return (
        <section id="campaign-history" className="card">
            <span className="card-label">FEEDBACK LOOP & OUTCOME TRACKING</span>
            <div className="section-header">
                <h2>
                    <BookOpen size={18} />
                    Campaign History & Learned Outcomes
                </h2>
                <span className="performance-badge">Evidence-Driven</span>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Historical outcomes are supplied to Sarvam AI as structured empirical evidence for subsequent recommendations.
            </p>

            {loading ? (
                <div className="rec-loading">
                    <div className="spinner"></div>
                    <p>Loading campaign history…</p>
                </div>
            ) : !campaigns || campaigns.length === 0 ? (
                <div className="rec-loading" style={{ color: '#64748b' }}>
                    <p>No campaign history recorded yet for this merchant.</p>
                </div>
            ) : (
                <div className="campaign-history-grid">
                    {campaigns.map(camp => {
                        const statusClass = camp.status || 'completed';
                        const uplift = camp.outcome_metrics?.uplift_percent;
                        const existingRating = camp.merchant_feedback?.rating;
                        const existingNotes = camp.merchant_feedback?.notes;
                        const currentSelectedRating = ratings[camp.campaign_id] || existingRating || 5;
                        const isSuccess = feedbackSuccess[camp.campaign_id];

                        return (
                            <div key={camp.campaign_id} className="campaign-row-card">
                                <div className="campaign-row-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{camp.title}</strong>
                                        <span className={`status-badge ${statusClass}`}>{camp.status}</span>
                                        {camp.execution_type === 'simulated' && (
                                            <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '4px' }}>
                                                Simulated Run
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        Window: {camp.target_window || 'General'}
                                    </span>
                                </div>

                                <div style={{ fontSize: '12.5px', color: '#475569' }}>
                                    {camp.description}
                                </div>

                                {/* Metrics Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Discount Offered</span>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{camp.discount || 0}%</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Recorded Uplift</span>
                                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#16a34a' }}>
                                            {uplift ? `+${uplift}%` : 'Pending'}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Projected Revenue</span>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>
                                            {camp.outcome_metrics?.projected_sales ? formatCurrency(camp.outcome_metrics.projected_sales) : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Baseline Sales</span>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>
                                            {camp.baseline_metrics?.sales ? formatCurrency(camp.baseline_metrics.sales) : '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Merchant Feedback Form / Display */}
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                                Merchant Review:
                                            </span>
                                            <div className="feedback-stars">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        size={15}
                                                        fill={star <= currentSelectedRating ? '#eab308' : 'none'}
                                                        stroke="#eab308"
                                                        onClick={() => handleRatingClick(camp.campaign_id, star)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {isSuccess && (
                                            <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Check size={14} /> Saved & added to AI feedback memory!
                                            </span>
                                        )}
                                    </div>

                                    {existingNotes ? (
                                        <div className="feedback-box">
                                            "{existingNotes}"
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="Add merchant notes (e.g. good footfall, stock cleared quickly)..."
                                                value={notes[camp.campaign_id] || ''}
                                                onChange={(e) => handleNoteChange(camp.campaign_id, e.target.value)}
                                                style={{ flex: 1, padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit' }}
                                            />
                                            <button
                                                className="agent-btn primary"
                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                                disabled={submittingId === camp.campaign_id}
                                                onClick={() => handleSubmit(camp.campaign_id)}
                                                type="button"
                                            >
                                                {submittingId === camp.campaign_id ? 'Saving…' : 'Save Review'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
