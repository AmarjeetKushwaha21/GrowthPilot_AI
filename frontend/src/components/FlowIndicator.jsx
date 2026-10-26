import React from 'react';
import {
    CheckCircle,
    Lightbulb,
    PlayCircle,
    BarChart2,
    TrendingUp
} from 'lucide-react';

export default function FlowIndicator({ currentStep }) {
    // Pipeline order
    const steps = [
        { id: 'observe', label: 'Observe', icon: CheckCircle },
        { id: 'understand', label: 'Understand', icon: CheckCircle },
        { id: 'recommend', label: 'Recommend', icon: Lightbulb },
        { id: 'execute', label: 'Execute', icon: PlayCircle },
        { id: 'measure', label: 'Measure', icon: BarChart2 },
        { id: 'grow', label: 'Grow', icon: TrendingUp }
    ];

    const stepOrder = ['observe', 'understand', 'recommend', 'execute', 'measure', 'grow'];
    const currentIdx = stepOrder.indexOf(currentStep);

    return (
        <div className="flow-indicator" id="flowIndicator">
            {steps.map((step, idx) => {
                const Icon = step.icon;
                let statusClass = '';
                if (idx < currentIdx) statusClass = 'completed';
                else if (idx === currentIdx) statusClass = 'active';

                return (
                    <React.Fragment key={step.id}>
                        <div className={`flow-step ${statusClass}`} id={`flow${step.label}`}>
                            <Icon size={14} />
                            <span>{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && <span className="flow-arrow">→</span>}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
