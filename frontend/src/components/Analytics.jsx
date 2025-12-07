import React, { useState, useEffect } from 'react';
import { getAnalytics, getAnalyticsHistory } from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, AreaChart, Area
} from 'recharts';
import { Activity, BarChart2, TrendingUp, Users, ChevronRight } from 'lucide-react';
import AdvancedAnalytics from './AdvancedAnalytics';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [currentStats, historyData] = await Promise.all([
                getAnalytics(),
                getAnalyticsHistory(7)
            ]);
            setStats(currentStats);
            setHistory(historyData);
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'advanced', label: 'Advanced Analytics', icon: TrendingUp }
    ];

    if (loading) return <div className="p-4 text-center">Loading analytics...</div>;

    return (
        <div className="animate-fade-in">
            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'var(--glass-bg)',
                padding: '0.5rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)',
                width: 'fit-content'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: activeTab === tab.id ? 'var(--accent-gradient)' : 'transparent',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' ? (
                <>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <TrendingUp /> Analytics & Performance
                    </h2>

                    {/* KPI Cards */}
                    <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                        <div className="glass-card">
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Posts Fetched (24h)</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>
                                {stats?.last_24h_activity?.posts_fetched || 0}
                            </div>
                        </div>
                        <div className="glass-card">
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comments Generated</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#34d399' }}>
                                {stats?.last_24h_activity?.comments_generated || 0}
                            </div>
                        </div>
                        <div className="glass-card">
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Posted</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f472b6' }}>
                                {stats?.last_24h_activity?.comments_posted || 0}
                            </div>
                        </div>
                        <div className="glass-card">
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rate Limit Remaining</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
                                {stats?.rate_limit?.remaining || 0}
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="glass-card" style={{ minHeight: '300px' }}>
                            <h3>Activity Trends (7 Days)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="posts" stroke="#60a5fa" fillOpacity={1} fill="url(#colorPosts)" name="Posts Fetched" />
                                    <Area type="monotone" dataKey="comments" stroke="#34d399" fillOpacity={1} fill="url(#colorComments)" name="Comments Generated" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-card" style={{ minHeight: '300px' }}>
                            <h3>Comment Queue Status</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={[stats?.queue_status || {}]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="pending" name="Pending Review" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="approved" name="Approved" fill="#34d399" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="scheduled" name="Scheduled" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick Access to Advanced */}
                    <div
                        className="glass-card"
                        onClick={() => setActiveTab('advanced')}
                        style={{
                            marginTop: '1.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        <div>
                            <h3 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                                Advanced Analytics Available
                            </h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                View sentiment trends, tone distribution, platform performance, and more
                            </p>
                        </div>
                        <ChevronRight size={24} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                </>
            ) : (
                <AdvancedAnalytics />
            )}
        </div>
    );
};

export default Analytics;
