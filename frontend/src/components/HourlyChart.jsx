import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function HourlyChart({ hourlyData, loading }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !hourlyData || hourlyData.length === 0) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clean up previous instance
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const labels = hourlyData.map(item => `${String(item.hour).padStart(2, '0')}:00`);
        const salesData = hourlyData.map(item => item.sales);
        const baselineData = hourlyData.map(item => item.historicalAverageSales);

        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Latest Day Sales (₹)',
                        data: salesData,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        tension: 0.35,
                        fill: true,
                        pointBackgroundColor: '#2563eb',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    },
                    {
                        label: 'Historical Baseline Sales (₹)',
                        data: baselineData,
                        borderColor: '#94a3b8',
                        borderDash: [6, 4],
                        tension: 0.35,
                        fill: false,
                        pointBackgroundColor: '#94a3b8',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: "'Inter', sans-serif", size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ₹${Number(context.raw || 0).toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Sales (₹)',
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            color: '#64748b'
                        },
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#94a3b8',
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            color: '#64748b'
                        },
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [hourlyData]);

    return (
        <div className="chart-card">
            <div className="chart-header">
                <h3>Hourly Sales Performance</h3>
                <p>Latest-day sales vs historical hourly baseline</p>
            </div>
            <div style={{ position: 'relative', height: '280px', width: '100%' }}>
                {loading && (
                    <div className="rec-loading" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner"></div>
                    </div>
                )}
                <canvas ref={canvasRef} id="hourlyChart" style={{ width: '100%', height: '100%' }}></canvas>
            </div>
        </div>
    );
}
