import React, { useState, useEffect } from 'react';
import { getAnalytics, getActivityLogs, exportAnalytics } from '../api';
import { PieChart, Activity, ThumbsUp, Download, BarChart3, Clock, TrendingUp, MessageSquare, RefreshCw } from 'lucide-react';

const Analytics = () => {
    const [stats, setStats] = useState({
        total_posts_analyzed: 0,
        total_comments_generated: 0,
        comments_by_status: { pending: 0, approved: 0, rejected: 0, posted: 0, scheduled: 0 },
        approval_rate: 0,
        post_rate: 0,
        posts_by_platform: {},
        comments_by_tone: {},
        average_sentiment: 0,
        comments_last_24h: 0
    });
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [analyticsData, logsData] = await Promise.all([
                getAnalytics(),
                getActivityLogs(20)
            ]);
            setStats(analyticsData);
            setActivityLogs(logsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
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
                <Icon size={28} />
            </div>
            <div>
                <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{value}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{title}</p>
                {subtitle && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{subtitle}</p>}
            </div>
        </div>
    );

    const ProgressBar = ({ label, value, total, color }) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        return (
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>{label}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{value}</span>
                </div>
                <div style={{
                    height: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>
        );
    };

    const getActionIcon = (action) => {
        if (action.includes('comment')) return '💬';
        if (action.includes('post')) return '📝';
        if (action.includes('setting')) return '⚙️';
        if (action.includes('schedule')) return '📅';
        return '📌';
    };

    const getActionColor = (action) => {
        if (action.includes('approved')) return '#34d399';
        if (action.includes('rejected')) return '#f87171';
        if (action.includes('posted')) return '#60a5fa';
        if (action.includes('generated')) return '#a78bfa';
        if (action.includes('scheduled')) return '#fbbf24';
        return 'var(--text-secondary)';
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📊 Analytics Dashboard</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Track system performance, engagement metrics, and activity.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
                    </button>
                    <button className="btn btn-primary" onClick={exportAnalytics}>
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
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
                    icon={MessageSquare}
                    color="139, 92, 246"
                    subtitle={`+${stats.comments_last_24h} in last 24h`}
                />
                <StatCard
                    title="Approval Rate"
                    value={`${stats.approval_rate.toFixed(1)}%`}
                    icon={ThumbsUp}
                    color="16, 185, 129"
                />
                <StatCard
                    title="Average Sentiment"
                    value={stats.average_sentiment >= 0 ? `+${stats.average_sentiment.toFixed(2)}` : stats.average_sentiment.toFixed(2)}
                    icon={TrendingUp}
                    color={stats.average_sentiment >= 0 ? "16, 185, 129" : "239, 68, 68"}
                />
            </div>

            {/* Detailed Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Comments by Status */}
                <div className="glass-card">
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PieChart size={20} /> Comments by Status
                    </h3>
                    <ProgressBar
                        label="Pending"
                        value={stats.comments_by_status.pending}
                        total={stats.total_comments_generated}
                        color="linear-gradient(90deg, #6b7280, #9ca3af)"
                    />
                    <ProgressBar
                        label="Approved"
                        value={stats.comments_by_status.approved}
                        total={stats.total_comments_generated}
                        color="linear-gradient(90deg, #10b981, #34d399)"
                    />
                    <ProgressBar
                        label="Scheduled"
                        value={stats.comments_by_status.scheduled}
                        total={stats.total_comments_generated}
                        color="linear-gradient(90deg, #f59e0b, #fbbf24)"
                    />
                    <ProgressBar
                        label="Posted"
                        value={stats.comments_by_status.posted}
                        total={stats.total_comments_generated}
                        color="linear-gradient(90deg, #3b82f6, #60a5fa)"
                    />
                    <ProgressBar
                        label="Rejected"
                        value={stats.comments_by_status.rejected}
                        total={stats.total_comments_generated}
                        color="linear-gradient(90deg, #ef4444, #f87171)"
                    />
                </div>

                {/* Posts by Platform */}
                <div className="glass-card">
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={20} /> Posts by Platform
                    </h3>
                    {Object.entries(stats.posts_by_platform).length > 0 ? (
                        Object.entries(stats.posts_by_platform).map(([platform, count]) => {
                            const colors = {
                                Twitter: 'linear-gradient(90deg, #1DA1F2, #4db8ff)',
                                LinkedIn: 'linear-gradient(90deg, #0077B5, #0099e6)',
                                Instagram: 'linear-gradient(90deg, #E1306C, #f56565)',
                                Manual: 'linear-gradient(90deg, #6b7280, #9ca3af)'
                            };
                            return (
                                <ProgressBar
                                    key={platform}
                                    label={platform}
                                    value={count}
                                    total={stats.total_posts_analyzed}
                                    color={colors[platform] || colors.Manual}
                                />
                            );
                        })
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                            No platform data yet
                        </p>
                    )}
                </div>

                {/* Comments by Tone */}
                <div className="glass-card">
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={20} /> Comments by Tone
                    </h3>
                    {Object.entries(stats.comments_by_tone).length > 0 ? (
                        Object.entries(stats.comments_by_tone).map(([tone, count]) => {
                            const colors = {
                                professional: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                casual: 'linear-gradient(90deg, #10b981, #34d399)',
                                enthusiastic: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                supportive: 'linear-gradient(90deg, #ec4899, #f472b6)'
                            };
                            return (
                                <ProgressBar
                                    key={tone}
                                    label={tone.charAt(0).toUpperCase() + tone.slice(1)}
                                    value={count}
                                    total={stats.total_comments_generated}
                                    color={colors[tone] || 'linear-gradient(90deg, #6b7280, #9ca3af)'}
                                />
                            );
                        })
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                            No tone data yet
                        </p>
                    )}
                </div>

                {/* Activity Log */}
                <div className="glass-card" style={{ gridColumn: 'span 1' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={20} /> Recent Activity
                    </h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {activityLogs.length > 0 ? (
                            activityLogs.map((log) => (
                                <div key={log.id} style={{
                                    padding: '0.75rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'flex-start'
                                }}>
                                    <span style={{ fontSize: '1.25rem' }}>{getActionIcon(log.action)}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: getActionColor(log.action),
                                            fontWeight: 500,
                                            textTransform: 'capitalize'
                                        }}>
                                            {log.action.replace(/_/g, ' ')}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {log.details}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                No activity yet
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card">
                <h3 style={{ marginTop: 0 }}>🎯 Quick Stats Summary</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399' }}>
                            {stats.post_rate.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Success Rate</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#60a5fa' }}>
                            {stats.comments_by_status.pending}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Review</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24' }}>
                            {stats.comments_by_status.scheduled}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scheduled</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#a78bfa' }}>
                            {stats.comments_last_24h}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last 24h</div>
                    </div>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Analytics;
