import React, { useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, BarChart2, PieChart, Calendar,
    RefreshCw, Download, Filter, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { useToast } from './ToastProvider';
import {
    getSentimentTrends, getToneDistribution, getPlatformPerformance,
    getAnalyticsHistory, exportAnalytics
} from '../api';

// Mini Bar Chart Component
const MiniBarChart = ({ data, maxValue, color = 'var(--accent-primary)' }) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
            {data.map((item, index) => (
                <div
                    key={index}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: `${(item.value / max) * 100}%`,
                            minHeight: '4px',
                            background: color,
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease'
                        }}
                        title={`${item.label}: ${item.value}`}
                    />
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                        {item.label.slice(5)} {/* Show just day part of date */}
                    </span>
                </div>
            ))}
        </div>
    );
};

// Sentiment Trend Line (simplified)
const SentimentTrendLine = ({ data }) => {
    if (!data || data.length === 0) return null;

    const minSentiment = Math.min(...data.map(d => d.avg_sentiment));
    const maxSentiment = Math.max(...data.map(d => d.avg_sentiment));
    const range = maxSentiment - minSentiment || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.avg_sentiment - minSentiment) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100px' }} preserveAspectRatio="none">
            <defs>
                <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
                </linearGradient>
            </defs>
            <polyline
                points={points}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
            <polygon
                points={`0,100 ${points} 100,100`}
                fill="url(#sentimentGradient)"
            />
        </svg>
    );
};

// Donut Chart Component
const DonutChart = ({ data, size = 120 }) => {
    const total = Object.values(data).reduce((sum, val) => sum + (val.total || val), 0);
    if (total === 0) return null;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const entries = Object.entries(data);

    let currentAngle = 0;
    const segments = entries.map(([key, value], index) => {
        const val = value.total || value;
        const angle = (val / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;

        const x1 = Math.cos((startAngle - 90) * Math.PI / 180) * 40 + 50;
        const y1 = Math.sin((startAngle - 90) * Math.PI / 180) * 40 + 50;
        const x2 = Math.cos((startAngle + angle - 90) * Math.PI / 180) * 40 + 50;
        const y2 = Math.sin((startAngle + angle - 90) * Math.PI / 180) * 40 + 50;

        const largeArc = angle > 180 ? 1 : 0;

        return {
            key,
            value: val,
            color: colors[index % colors.length],
            path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
        };
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
                {segments.map((seg, i) => (
                    <path key={i} d={seg.path} fill={seg.color} opacity={0.9} />
                ))}
                <circle cx="50" cy="50" r="25" fill="var(--bg-primary)" />
                <text x="50" y="50" textAnchor="middle" dy=".3em"
                    style={{ fill: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>
                    {total}
                </text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {segments.map((seg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color }} />
                        <span style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{seg.key}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({Math.round((seg.value / total) * 100)}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Stat Card with Trend
const StatCard = ({ title, value, change, icon: Icon, color, trend }) => {
    const getTrendIcon = () => {
        if (trend === 'up') return <ArrowUp size={14} color="#10b981" />;
        if (trend === 'down') return <ArrowDown size={14} color="#ef4444" />;
        return <Minus size={14} color="var(--text-secondary)" />;
    };

    return (
        <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{title}</p>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>{value}</h3>
                    {change !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            {getTrendIcon()}
                            <span style={{
                                color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : 'var(--text-secondary)'
                            }}>
                                {change}
                            </span>
                        </div>
                    )}
                </div>
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: color || 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {Icon && <Icon size={20} color="white" />}
                </div>
            </div>
        </div>
    );
};

// Main Advanced Analytics Component
const AdvancedAnalytics = () => {
    const [sentimentTrends, setSentimentTrends] = useState([]);
    const [toneDistribution, setToneDistribution] = useState({});
    const [platformPerformance, setPlatformPerformance] = useState({});
    const [activityHistory, setActivityHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState(7);
    const toast = useToast();

    useEffect(() => {
        loadAllData();
    }, [timeRange]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [trends, tones, platforms, history] = await Promise.all([
                getSentimentTrends(timeRange),
                getToneDistribution(),
                getPlatformPerformance(),
                getAnalyticsHistory(timeRange)
            ]);

            setSentimentTrends(trends);
            setToneDistribution(tones);
            setPlatformPerformance(platforms);
            setActivityHistory(history);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportAnalytics();
        toast.success('Downloading analytics CSV...');
    };

    // Calculate summary stats
    const totalComments = sentimentTrends.reduce((sum, d) => sum + d.comment_count, 0);
    const avgSentiment = sentimentTrends.length > 0
        ? (sentimentTrends.reduce((sum, d) => sum + d.avg_sentiment, 0) / sentimentTrends.length).toFixed(3)
        : 0;

    // Find best performing platform
    const bestPlatform = Object.entries(platformPerformance)
        .sort((a, b) => b[1].total_comments - a[1].total_comments)[0];

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h2 style={{
                        margin: '0 0 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '1.5rem'
                    }}>
                        <TrendingUp size={28} style={{ color: 'var(--accent-primary)' }} />
                        Advanced Analytics
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Deep insights into your comment performance and trends
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem'
                        }}
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                    </select>

                    <button onClick={loadAllData} className="btn-secondary" disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>

                    <button onClick={handleExport} className="btn-primary">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '4rem'
                }}>
                    <RefreshCw size={32} className="spin" style={{ color: 'var(--text-secondary)' }} />
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <StatCard
                            title="Total Comments"
                            value={totalComments}
                            change={`${timeRange} day period`}
                            icon={BarChart2}
                            color="linear-gradient(135deg, #6366f1, #4f46e5)"
                        />
                        <StatCard
                            title="Avg Sentiment"
                            value={avgSentiment}
                            trend={avgSentiment > 0 ? 'up' : avgSentiment < 0 ? 'down' : 'neutral'}
                            change={avgSentiment > 0 ? 'Positive' : avgSentiment < 0 ? 'Negative' : 'Neutral'}
                            icon={TrendingUp}
                            color="linear-gradient(135deg, #10b981, #059669)"
                        />
                        <StatCard
                            title="Best Platform"
                            value={bestPlatform ? bestPlatform[0] : 'N/A'}
                            change={bestPlatform ? `${bestPlatform[1].total_comments} comments` : '-'}
                            icon={PieChart}
                            color="linear-gradient(135deg, #f59e0b, #d97706)"
                        />
                        <StatCard
                            title="Active Days"
                            value={sentimentTrends.filter(d => d.comment_count > 0).length}
                            change={`of ${timeRange} days`}
                            icon={Calendar}
                            color="linear-gradient(135deg, #ec4899, #be185d)"
                        />
                    </div>

                    {/* Charts Row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        {/* Sentiment Trends Chart */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={18} style={{ color: '#10b981' }} />
                                Sentiment Trends
                            </h3>
                            {sentimentTrends.length > 0 ? (
                                <>
                                    <SentimentTrendLine data={sentimentTrends} />
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginTop: '0.5rem',
                                        fontSize: '0.7rem',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <span>{sentimentTrends[0]?.date}</span>
                                        <span>{sentimentTrends[sentimentTrends.length - 1]?.date}</span>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                    No sentiment data available
                                </p>
                            )}
                        </div>

                        {/* Tone Distribution */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <PieChart size={18} style={{ color: '#6366f1' }} />
                                Tone Distribution
                            </h3>
                            {Object.keys(toneDistribution).length > 0 ? (
                                <DonutChart data={toneDistribution} />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                    No tone data available
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Activity History & Platform Performance */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {/* Activity History */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BarChart2 size={18} style={{ color: '#f59e0b' }} />
                                Daily Activity
                            </h3>
                            {activityHistory.length > 0 ? (
                                <MiniBarChart
                                    data={activityHistory.map(d => ({
                                        label: d.date,
                                        value: d.comments
                                    }))}
                                    color="#f59e0b"
                                />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                    No activity data available
                                </p>
                            )}
                        </div>

                        {/* Platform Performance */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Filter size={18} style={{ color: '#ec4899' }} />
                                Platform Performance
                            </h3>
                            {Object.keys(platformPerformance).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {Object.entries(platformPerformance).map(([platform, stats]) => (
                                        <div key={platform} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '0.5rem'
                                        }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{platform}</span>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {stats.total_posts} posts • {stats.total_comments} comments
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: stats.avg_sentiment > 0 ? '#10b981' : stats.avg_sentiment < 0 ? '#ef4444' : 'var(--text-secondary)'
                                                }}>
                                                    {stats.avg_sentiment > 0 ? '+' : ''}{stats.avg_sentiment}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                                    avg sentiment
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                    No platform data available
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tone Approval Rates */}
                    {Object.keys(toneDistribution).length > 0 && (
                        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>
                                📊 Tone Approval Rates
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '1rem'
                            }}>
                                {Object.entries(toneDistribution).map(([tone, stats]) => (
                                    <div key={tone} style={{
                                        textAlign: 'center',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '0.75rem'
                                    }}>
                                        <div style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 700,
                                            color: stats.approval_rate >= 70 ? '#10b981' : stats.approval_rate >= 40 ? '#f59e0b' : '#ef4444'
                                        }}>
                                            {stats.approval_rate}%
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                            {tone}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {stats.approved}/{stats.total} approved
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdvancedAnalytics;
