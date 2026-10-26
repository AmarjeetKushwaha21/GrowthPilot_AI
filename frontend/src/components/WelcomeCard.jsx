import React from 'react';
import { getTimeGreeting } from '../utils/formatters';

export default function WelcomeCard({ merchantName }) {
    const greeting = getTimeGreeting(merchantName);

    return (
        <section id="dashboard" className="card welcome-card">
            <h2 id="welcomeHeading">{greeting}</h2>
            <p id="welcomeSubtext">Here's what GrowthPilot AI detected from your recent transactions.</p>
        </section>
    );
}
