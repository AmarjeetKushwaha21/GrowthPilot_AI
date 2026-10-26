import React from 'react';
import { Sparkles } from 'lucide-react';

export default function BusinessHealth({ analysisText, loading }) {
    return (
        <section id="business-insights" className="card">
            <span className="card-label ai">AI ANALYSIS</span>
            <div className="section-header">
                <h2>
                    <Sparkles size={18} />
                    Business Intelligence
                </h2>
            </div>

            <p
                id="healthMessage"
                className={`health-content ${loading ? 'loading' : ''}`}
            >
                {loading ? 'Analyzing your transaction patterns…' : (analysisText || 'Transaction patterns stable. No anomalies detected.')}
            </p>
        </section>
    );
}
