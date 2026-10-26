import React from 'react';
import { Clock, Check } from 'lucide-react';

export default function ActivityTimeline({
    recommendationsCount,
    activatedAction
}) {
    return (
        <section className="card">
            <span className="card-label">ACTIVITY LOG</span>
            <div className="section-header">
                <h2>
                    <Clock size={18} />
                    Activity Timeline
                </h2>
            </div>

            <div className="timeline">
                <div className="timeline-item">
                    <div className="timeline-dot completed">
                        <Check size={11} />
                    </div>
                    <div className="timeline-content">
                        <strong>Transaction patterns analyzed</strong>
                        <span>GrowthPilot AI • Business Health Check</span>
                    </div>
                </div>

                <div className="timeline-item">
                    <div className="timeline-dot completed">
                        <Check size={11} />
                    </div>
                    <div className="timeline-content">
                        <strong id="recommendedActionHistory">
                            {recommendationsCount ? `${recommendationsCount} growth options generated` : 'Growth opportunities identified'}
                        </strong>
                        <span>Sarvam AI • 3 options generated</span>
                    </div>
                </div>

                {activatedAction && (
                    <div className="timeline-item" id="activatedHistory">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-content">
                            <strong id="activatedActionHistory">
                                {activatedAction.discount ? `${activatedAction.discount}% ` : ''}
                                {activatedAction.action || activatedAction.type} activated
                            </strong>
                            <span>Merchant approved • Campaign live</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
