import React, { createContext, useContext } from 'react';
import { useDashboard } from '../hooks/useDashboard';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
    const dashboard = useDashboard();
    return (
        <DashboardContext.Provider value={dashboard}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboardContext() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
}
