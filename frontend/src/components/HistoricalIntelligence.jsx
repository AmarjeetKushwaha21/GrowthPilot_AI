import React from 'react';
import {
    LineChart,
    TrendingUp,
    TrendingDown,
    Clock,
    AlertCircle,
    CheckCircle2,
    PieChart,
    Flame
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export default function HistoricalIntelligence({ data, loading }) {
    if (loading) {
        return (
            <section id="historical-intel" className="card">
                <span className="card-label intel">DETERMINISTIC BUSINESS INTELLIGENCE</span>
                <div className="section-header">
                    <h2>
                        <LineChart size={18} />
                        Historical Business Insights & Trends
                    </h2>
                </div>
                <div className="rec-loading">
                    <div className="spinner"></div>
                    <p>Computing deterministic historical intelligence…</p>
                </div>
            </section>
        );
    }

    if (!data || !data.hasData) {
        return (
            <section id="historical-intel" className="card">
                <span className="card-label intel">DETERMINISTIC BUSINESS INTELLIGENCE</span>
                <div className="section-header">
                    <h2>
                        <LineChart size={18} />
                        Historical Business Insights & Trends
                    </h2>
                </div>
                <p style={{ color: '#64748b', fontSize: '13px' }}>
                    {data?.message || 'Insufficient historical data available.'}
                </p>
            </section>
        );
    }

    const { metrics, hourlyPerformance, categoryTrends, recurringPatterns, facts } = data;
    const peakHour = hourlyPerformance?.peakHour;
    const lowestHour = hourlyPerformance?.lowestHour;

    return (
        <section id="historical-intel" className="card">
            <span className="card-label intel">DETERMINISTIC BUSINESS INTELLIGENCE</span>
            <div className="section-header">
                <h2>
                    <LineChart size={18} />
                    Historical Business Insights & Trends
                </h2>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                    Calculated over {data.totalHistoricalDays} recorded days
                </span>
            </div>

            {/* Period-over-Period Performance Comparison */}
            <div className="intel-grid">
                <div className="intel-metric-card">
                    <div className="label">Current vs Avg Daily Revenue</div>
                    <div className="value">{formatCurrency(metrics.currentSales)}</div>
                    <div className={`diff ${metrics.salesChangePct >= 0 ? 'pos' : 'neg'}`}>
                        {metrics.salesChangePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {formatPercentage(metrics.salesChangePct)} vs baseline ({formatCurrency(metrics.previousAvgDailySales)})
                    </div>
                </div>

                <div className="intel-metric-card">
                    <div className="label">Order Volume Comparison</div>
                    <div className="value">{metrics.currentOrders} orders</div>
                    <div className={`diff ${metrics.orderCountChangePct >= 0 ? 'pos' : 'neg'}`}>
                        {metrics.orderCountChangePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {formatPercentage(metrics.orderCountChangePct)} vs avg ({metrics.previousAvgDailyOrders} orders/day)
                    </div>
                </div>

                <div className="intel-metric-card">
                    <div className="label">Average Order Value (AOV)</div>
                    <div className="value">{formatCurrency(metrics.currentAOV)}</div>
                    <div className={`diff ${metrics.aovChangePct >= 0 ? 'pos' : 'neg'}`}>
                        {metrics.aovChangePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {formatPercentage(metrics.aovChangePct)} vs baseline ({formatCurrency(metrics.previousAOV)})
                    </div>
                </div>
            </div>

            {/* Peak & Lowest Operating Hours */}
            <div className="hour-badge-container">
                {peakHour && (
                    <div className="hour-badge peak">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>
                            <Flame size={14} />
                            Peak Performance Window
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {peakHour.formattedHour} – {String(peakHour.hour + 1).padStart(2, '0')}:00
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                            Averages {formatCurrency(peakHour.avgSalesPerHour)} across {peakHour.avgTxCountPerHour} orders
                        </div>
                    </div>
                )}

                {lowestHour && (
                    <div className="hour-badge lowest">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>
                            <Clock size={14} />
                            Lowest Activity Window (Growth Target)
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {lowestHour.formattedHour} – {String(lowestHour.hour + 1).padStart(2, '0')}:00
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                            Averages {formatCurrency(lowestHour.avgSalesPerHour)} across {lowestHour.avgTxCountPerHour} orders
                        </div>
                    </div>
                )}
            </div>

            {/* Product & Category Sales Distribution */}
            {categoryTrends && categoryTrends.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                        <PieChart size={15} />
                        Category Revenue Distribution & Trends
                    </div>
                    <table className="category-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Total Revenue</th>
                                <th>Orders</th>
                                <th>Avg Ticket</th>
                                <th>Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryTrends.map(cat => (
                                <tr key={cat.category}>
                                    <td style={{ fontWeight: 600 }}>{cat.category}</td>
                                    <td>{formatCurrency(cat.totalSales)}</td>
                                    <td>{cat.orderCount}</td>
                                    <td>{formatCurrency(cat.averagePrice)}</td>
                                    <td style={{ width: '130px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                            <span>{cat.sharePercentage}%</span>
                                        </div>
                                        <div className="category-bar-bg">
                                            <div
                                                className="category-bar-fill"
                                                style={{ width: `${Math.min(cat.sharePercentage, 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Recurring Patterns */}
            {recurringPatterns && recurringPatterns.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                        Detected Recurring Patterns
                    </div>
                    <div className="recurring-patterns-list">
                        {recurringPatterns.map(pattern => (
                            <div key={pattern.patternId} className="pattern-item">
                                {pattern.type === 'strength' ? (
                                    <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                                ) : (
                                    <AlertCircle size={18} style={{ color: '#d97706' }} />
                                )}
                                <div>
                                    <div className="pattern-title">{pattern.title}</div>
                                    <div className="pattern-desc">{pattern.description}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        Confidence: <strong>{pattern.confidence}</strong> • Frequency: {pattern.frequency}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Observed Deterministic Facts */}
            {facts && facts.length > 0 && (
                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                        Verified Factual Observations
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                        {facts.map((fact, idx) => (
                            <li key={idx}>{fact}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
