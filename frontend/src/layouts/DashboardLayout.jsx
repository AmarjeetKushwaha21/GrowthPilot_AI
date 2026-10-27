import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function DashboardLayout({
    activeSection,
    onSelectSection,
    currentMerchant,
    merchants,
    onSelectMerchant,
    children
}) {
    return (
        <div className="app-container">
            <Sidebar
                activeSection={activeSection}
                onSelectSection={onSelectSection}
            />
            <Topbar
                currentMerchant={currentMerchant}
                merchants={merchants}
                onSelectMerchant={onSelectMerchant}
            />
            <main>
                {children}
            </main>
        </div>
    );
}
