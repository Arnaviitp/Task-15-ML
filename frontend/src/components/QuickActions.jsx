import React, { useState, useEffect } from 'react';
import {
    getPosts, fetchPosts, generateComment, getComments,
    updateCommentStatus, processScheduledComments, getAnalytics
} from '../api';
import {
    Zap, RefreshCw, CheckCircle, Send, Sparkles, Loader,
    ArrowRight, Package, Clock, TrendingUp, AlertTriangle,
    Play, Pause, Settings
} from 'lucide-react';

const QuickActions = ({ onAction, onNotification }) => {
    const [loading, setLoading] = useState(null);
    const [stats, setStats] = useState({
        totalPosts: 0,
        pendingComments: 0,
        approvedComments: 0,
        scheduledDue: 0
    });

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            const [posts, comments, analytics] = await Promise.all([
                getPosts(),
                getComments(),
                getAnalytics()
            ]);

            setStats({
                totalPosts: posts.length,
                pendingComments: comments.filter(c => c.status === 'pending').length,
                approvedComments: comments.filter(c => c.status === 'approved').length,
                scheduledDue: analytics.by_status?.scheduled || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const notify = (message, type = 'success') => {
        if (onNotification) {
            onNotification(message, type);
        }
    };

    const handleAction = async (actionKey, actionFn) => {
        setLoading(actionKey);
        try {
            await actionFn();
            if (onAction) onAction();
            loadStats();
        } catch (error) {
            console.error(`Error in ${actionKey}:`, error);
            notify(`Failed: ${error.message}`, 'error');
        } finally {
            setLoading(null);
        }
    };

    const quickActions = [
        {
            key: 'fetch',
            label: 'Fetch Posts',
            description: 'Get new posts from platforms',
            icon: RefreshCw,
            color: '#60a5fa',
            badge: stats.totalPosts,
            action: async () => {
                const result = await fetchPosts();
                notify(`✅ Fetched ${result.count || 0} new posts!`);
            }
        },
        {
            key: 'generate-all',
            label: 'Generate All',
            description: 'Generate comments for all posts',
            icon: Sparkles,
            color: '#a78bfa',
            badge: null,
            action: async () => {
                const posts = await getPosts();
                const postsWithoutComments = posts.slice(0, 5);
                let generated = 0;
                for (const post of postsWithoutComments) {
                    try {
                        await generateComment(post.id, 'casual', 'medium', false);
                        generated++;
                    } catch (e) {
                        console.error('Generate error:', e);
                    }
                }
                notify(`✨ Generated ${generated} comments!`);
            }
        },
        {
            key: 'approve-all',
            label: 'Approve All',
            description: 'Approve all pending comments',
            icon: CheckCircle,
            color: '#34d399',
            badge: stats.pendingComments,
            action: async () => {
                const comments = await getComments('pending');
                let approved = 0;
                for (const comment of comments) {
                    try {
                        await updateCommentStatus(comment.id, 'approved');
                        approved++;
                    } catch (e) {
                        console.error('Approve error:', e);
                    }
                }
                notify(`✅ Approved ${approved} comments!`);
            }
        },
        {
            key: 'process-scheduled',
            label: 'Process Scheduled',
            description: 'Post all due scheduled comments',
            icon: Clock,
            color: '#fbbf24',
            badge: stats.scheduledDue,
            action: async () => {
                const result = await processScheduledComments();
                notify(`📤 Posted ${result.processed_count} scheduled comments!`);
            }
        }
    ];

    return (
        <div className="quick-actions">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={20} style={{ color: '#fbbf24' }} />
                    Quick Actions
                </h3>
                <button
                    className="btn btn-secondary"
                    onClick={loadStats}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem'
            }}>
                {quickActions.map((action) => (
                    <button
                        key={action.key}
                        onClick={() => handleAction(action.key, action.action)}
                        disabled={loading !== null}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            background: loading === action.key
                                ? `rgba(${action.color === '#60a5fa' ? '96,165,250' : action.color === '#a78bfa' ? '167,139,250' : action.color === '#34d399' ? '52,211,153' : '251,191,36'}, 0.2)`
                                : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${loading === action.key ? action.color : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '0.75rem',
                            cursor: loading !== null ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            opacity: loading !== null && loading !== action.key ? 0.5 : 1
                        }}
                    >
                        {action.badge !== null && action.badge > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: action.color,
                                color: 'white',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.4rem',
                                borderRadius: '999px'
                            }}>
                                {action.badge}
                            </span>
                        )}
                        <div style={{ color: action.color }}>
                            {loading === action.key ? (
                                <Loader size={24} className="spin" />
                            ) : (
                                <action.icon size={24} />
                            )}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {action.label}
                        </div>
                        <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'center'
                        }}>
                            {action.description}
                        </div>
                    </button>
                ))}
            </div>

            <style>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default QuickActions;
