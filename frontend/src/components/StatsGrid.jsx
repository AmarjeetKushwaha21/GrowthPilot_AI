import React from 'react';
import { IndianRupee, Calendar, TrendingDown, TrendingUp, Receipt } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export default function StatsGrid({ stats, loading }) {
    const currentSales = stats ? formatCurrency(stats.currentSales) : '—';
    const lastMonthSales = stats ? formatCurrency(stats.lastMonthSales) : '—';
    const salesChange = stats ? formatPercentage(stats.salesChange) : '—';
    const isPositive = stats ? stats.salesChange >= 0 : false;
    const transactions = stats ? stats.transactions : '—';

    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-icon blue">
                    <IndianRupee size={17} />
                </div>
                <div className="stat-label">Today's Sales</div>
                <div className="stat-value" id="currentSales">
                    {loading ? '…' : currentSales}
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon slate">
                    <Calendar size={17} />
                </div>
                <div className="stat-label">Avg. Previous Day</div>
                <div className="stat-value" id="lastMonthSales">
                    {loading ? '…' : lastMonthSales}
                </div>
            </div>

            <div className="stat-card">
                <div className={`stat-icon ${isPositive ? 'green' : 'red'}`}>
                    {isPositive ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                </div>
                <div className="stat-label">Day-over-Day Change</div>
                <div className={`stat-value ${isPositive ? 'positive' : 'negative'}`} id="salesChange">
                    {loading ? '…' : salesChange}
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon green">
                    <Receipt size={17} />
                </div>
                <div className="stat-label">Today's Transactions</div>
                <div className="stat-value" id="transactions">
                    {loading ? '…' : transactions}
                </div>
            </div>
        </div>
    );
}
