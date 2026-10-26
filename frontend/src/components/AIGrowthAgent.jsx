import React, { useState } from 'react';
import {
    Bot,
    Play,
    CheckCircle,
    XCircle,
    Edit3,
    AlertCircle,
    ShieldCheck,
    Cpu,
    ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function AIGrowthAgent({
    merchantName,
    agentState,
    loading,
    onRunCycle,
    onApprove,
    onReject,
    onEditAndApprove
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDiscount, setEditedDiscount] = useState(15);
    const [actionMessage, setActionMessage] = useState('');

    const startEdit = (rec) => {
        setEditedTitle(rec.title);
        setEditedDiscount(rec.discount || 15);
        setIsEditing(true);
    };

    const handleApprove = async (campaign) => {
        setActionMessage('Executing action...');
        try {
            await onApprove(campaign);
            setActionMessage(`✓ Campaign "${campaign.title}" successfully approved and executed!`);
            setIsEditing(false);
        } catch (e) {
            setActionMessage(`Execution failed: ${e.message}`);
        }
    };

    const handleReject = async (campaign) => {
        setActionMessage('Rejecting recommendation...');
        try {
            await onReject(campaign);
            setActionMessage(`Recommendation "${campaign.title}" rejected and recorded in historical memory.`);
            setIsEditing(false);
        } catch (e) {
            setActionMessage(`Rejection failed: ${e.message}`);
        }
    };

    const handleSaveEdit = async (campaign) => {
        setActionMessage('Updating and executing action...');
        try {
            await onEditAndApprove({
                ...campaign,
                title: editedTitle,
                discount: Number(editedDiscount)
            });
            setActionMessage(`✓ Customized campaign "${editedTitle}" approved and executed!`);
            setIsEditing(false);
        } catch (e) {
            setActionMessage(`Update failed: ${e.message}`);
        }
    };

    const recommendation = agentState?.recommendation;
    const evidence = agentState?.supportingEvidence;
    const opportunity = agentState?.opportunity;

    const workflowSteps = [
        'Transaction Analysis',
        'Identify Opportunity',
        'Generate Recommendation',
        'Show Supporting Evidence',
        'Merchant Approval',
        'Execute Action',
        'Record Outcome',
        'Feedback into History'
    ];

    return (
        <section id="growth-agent" className="card">
            <span className="card-label agent">AUTONOMOUS COORDINATOR</span>
            <div className="section-header">
                <h2>
                    <Bot size={18} style={{ color: '#7c3aed' }} />
                    AI Growth Agent
                </h2>
                <span className="performance-badge" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                    Demo Mode • Simulated Execution
                </span>
            </div>

            {/* Agent Control Header Banner */}
            <div className="agent-banner">
                <div>
                    <h2>
                        <Cpu size={20} />
                        GrowthPilot AI Growth Agent — Autonomous Cycle
                    </h2>
                    <p>
                        Monitors transactions for {merchantName}, detects low-activity windows, requests approval, and records empirical outcomes.
                    </p>
                </div>
                <button
                    className="agent-btn primary"
                    onClick={onRunCycle}
                    disabled={loading}
                    type="button"
                    style={{ background: '#ffffff', color: '#312e81', fontWeight: 700 }}
                >
                    <Play size={14} />
                    {loading ? 'Running Agent Cycle…' : 'Run Growth Cycle'}
                </button>
            </div>

            {/* Workflow Step Pipeline */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    8-Stage Autonomous Workflow:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {workflowSteps.map((s, idx) => (
                        <React.Fragment key={s}>
                            <span style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: idx <= 4 ? '#eff6ff' : '#ffffff',
                                color: idx <= 4 ? '#1d4ed8' : '#64748b',
                                border: '1px solid',
                                borderColor: idx <= 4 ? '#bfdbfe' : '#e2e8f0',
                                fontWeight: idx === 4 ? 700 : 500
                            }}>
                                {idx + 1}. {s}
                            </span>
                            {idx < workflowSteps.length - 1 && (
                                <ArrowRight size={10} style={{ color: '#cbd5e1' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Awaiting Merchant Approval Section */}
            {recommendation && recommendation.status === 'recommended' && (
                <div style={{ border: '1px solid #c7d2fe', background: '#faf5ff', borderRadius: '8px', padding: '18px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6d28d9', fontWeight: 700, fontSize: '14px' }}>
                            <ShieldCheck size={18} />
                            Merchant Approval Required Before Execution
                        </div>
                        <span style={{ fontSize: '11px', background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Target: {recommendation.target_window}
                        </span>
                    </div>

                    {!isEditing ? (
                        <>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                                {recommendation.title}
                            </div>
                            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
                                {recommendation.description}
                            </p>

                            {/* Supporting Evidence Breakdown */}
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Supporting Evidence (Deterministic Facts):
                                </div>
                                <ul style={{ fontSize: '12px', color: '#334155', paddingLeft: '18px', lineHeight: 1.6 }}>
                                    <li>Drop observed: <strong>{evidence?.dropPercentage}</strong> drop below historical hourly baseline ({evidence?.observedDrop}).</li>
                                    <li>Target Time Window: <strong>{evidence?.window}</strong>.</li>
                                    <li>Product Context: {evidence?.categoryInfluence}.</li>
                                    <li>Empirical Feedback: {evidence?.historicalFeedbackApplied ? 'Calibrated using previous merchant outcome feedback.' : 'Initial baseline experiment.'}</li>
                                </ul>
                            </div>

                            {/* Action Buttons: Approve, Edit, Reject */}
                            <div className="agent-actions-group">
                                <button
                                    className="agent-btn approve"
                                    onClick={() => handleApprove(recommendation)}
                                    type="button"
                                >
                                    <CheckCircle size={15} />
                                    Approve & Execute (Simulated)
                                </button>

                                <button
                                    className="agent-btn edit"
                                    onClick={() => startEdit(recommendation)}
                                    type="button"
                                >
                                    <Edit3 size={15} />
                                    Edit Details
                                </button>

                                <button
                                    className="agent-btn reject"
                                    onClick={() => handleReject(recommendation)}
                                    type="button"
                                >
                                    <XCircle size={15} />
                                    Reject Recommendation
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                Edit Recommendation Parameters
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                                    Campaign Title
                                </label>
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                                    Discount Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={editedDiscount}
                                    onChange={(e) => setEditedDiscount(e.target.value)}
                                    style={{ width: '120px', padding: '7px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="agent-btn approve"
                                    onClick={() => handleSaveEdit(recommendation)}
                                    type="button"
                                >
                                    <CheckCircle size={14} />
                                    Save & Approve
                                </button>
                                <button
                                    className="agent-btn edit"
                                    onClick={() => setIsEditing(false)}
                                    type="button"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {actionMessage && (
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} />
                    {actionMessage}
                </div>
            )}
        </section>
    );
}
