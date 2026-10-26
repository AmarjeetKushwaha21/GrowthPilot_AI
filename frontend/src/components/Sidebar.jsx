import React from 'react';
import {
    LayoutDashboard,
    BarChart3,
    Zap,
    Activity,
    LineChart,
    BookOpen,
    Bot,
    Compass
} from 'lucide-react';

export default function Sidebar({ activeSection, onSelectSection }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'business-insights', label: 'Business Insights', icon: BarChart3 },
        { id: 'growth-actions', label: 'Growth Actions', icon: Zap },
        { id: 'performance', label: 'Performance', icon: Activity },
        { id: 'historical-intel', label: 'Historical Intelligence', icon: LineChart },
        { id: 'campaign-history', label: 'Campaign History', icon: BookOpen },
        { id: 'growth-agent', label: 'AI Growth Agent', icon: Bot, badge: 'Agent' }
    ];

    const handleClick = (e, id) => {
        e.preventDefault();
        onSelectSection(id);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <aside className="sidebar">
            <h2 className="logo">
                <Compass size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                GrowthPilot AI
            </h2>
            <p className="logo-sub">From Insights to Action</p>

            <nav>
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            className={isActive ? 'active' : ''}
                            onClick={(e) => handleClick(e, item.id)}
                            type="button"
                        >
                            <Icon size={17} />
                            <span>{item.label}</span>
                            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
