import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../api';
import { PieChart, Activity, ThumbsUp, Download } from 'lucide-react';

const Analytics = () => {
    const [stats, setStats] = useState({
        total_posts_analyzed: 0,
        total_comments_generated: 0,
        approval_rate: 0
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getAnalytics();
            setStats(data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `rgba(${color}, 0.2)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: `rgb(${color})`
            }}>
                <Icon size={30} />
            </div>
            <div>
                <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{value}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{title}</p>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Analytics</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Track system performance and engagement metrics.</p>
                </div>
                <a href="http://localhost:8000/analytics/export" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <Download size={18} /> Export CSV
                </a>
            </div>

            <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '2rem' }}>
                <StatCard
                    title="Posts Analyzed"
                    value={stats.total_posts_analyzed}
                    icon={Activity}
                    color="59, 130, 246"
                />
                <StatCard
                    title="Comments Generated"
                    value={stats.total_comments_generated}
                    icon={PieChart}
                    color="139, 92, 246"
                />
                <StatCard
                    title="Approval Rate"
                    value={`${stats.approval_rate.toFixed(1)}%`}
                    icon={ThumbsUp}
                    color="16, 185, 129"
                />
            </div>

            <div className="glass-card">
                <h3 style={{ marginTop: 0 }}>Recent Activity Log</h3>
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
                    Chart visualization coming soon...
                </div>
            </div>
        </div>
    );
};

export default Analytics;
