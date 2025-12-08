import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    getSettings, updateSetting, fetchPosts, generateComment,
    getComments, updateCommentStatus, processScheduledComments,
    getScheduledComments
} from '../api';
import {
    Play, Pause, RefreshCw, Clock,
    Activity, Loader, Power, Bot,
    Sparkles, Calendar, Send, Eye, Volume2, VolumeX
} from 'lucide-react';

const AutomationCenter = ({ onNotification }) => {
    // Automation State
    const [isRunning, setIsRunning] = useState(false);
    const [autoFetch, setAutoFetch] = useState(false);
    const [autoGenerate, setAutoGenerate] = useState(false);
    const [autoApprove, setAutoApprove] = useState(false);
    const [autoPost, setAutoPost] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Refs for settings to avoid stale closures in intervals
    const autoFetchRef = useRef(false);
    const autoGenerateRef = useRef(false);
    const autoApproveRef = useRef(false);
    const autoPostRef = useRef(false);

    // Intervals
    const [fetchInterval, setFetchInterval] = useState(60);
    const [processInterval, setProcessInterval] = useState(30);

    // Stats
    const [stats, setStats] = useState({
        postsProcessed: 0,
        commentsGenerated: 0,
        commentsPosted: 0,
        uptime: 0
    });

    // Live status
    const [liveStatus, setLiveStatus] = useState('idle');
    const [pendingCount, setPendingCount] = useState(0);
    const [scheduledCount, setScheduledCount] = useState(0);
    const [nextAction, setNextAction] = useState(null);

    // Refs for intervals
    const fetchTimerRef = useRef(null);
    const processTimerRef = useRef(null);
    const statsTimerRef = useRef(null);
    const uptimeRef = useRef(null);
    const startTimeRef = useRef(null);

    // Activity Log
    const [activityLog, setActivityLog] = useState([]);

    // Load initial settings
    useEffect(() => {
        loadSettings();
        loadStats();
        return () => stopAllTimers();
    }, []);

    // Sync refs with state whenever state changes
    useEffect(() => {
        autoFetchRef.current = autoFetch;
        autoGenerateRef.current = autoGenerate;
        autoApproveRef.current = autoApprove;
        autoPostRef.current = autoPost;
    }, [autoFetch, autoGenerate, autoApprove, autoPost]);

    const loadSettings = async () => {
        try {
            const settings = await getSettings();
            setAutoFetch(settings.auto_fetch_enabled === 'true');
            setAutoGenerate(settings.auto_generate_enabled === 'true');
            setAutoPost(settings.auto_post_enabled === 'true');
            setAutoApprove(settings.auto_approve_enabled === 'true');
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadStats = async () => {
        try {
            const commentsData = await getComments();
            if (Array.isArray(commentsData)) {
                setPendingCount(commentsData.filter(c => c.status === 'pending').length);
            }
            const scheduledData = await getScheduledComments();
            setScheduledCount(scheduledData.due_count || 0);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const addActivity = useCallback((message, type = 'info') => {
        const activity = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };
        setActivityLog(prev => [activity, ...prev.slice(0, 49)]);
        if (onNotification) {
            onNotification(message, type);
        }
        if (soundEnabled && (type === 'success' || type === 'warning')) {
            playNotificationSound();
        }
    }, [onNotification, soundEnabled]);

    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            oscillator.start();
            setTimeout(() => oscillator.stop(), 100);
        } catch (e) { /* Audio not supported */ }
    };

    const stopAllTimers = () => {
        if (fetchTimerRef.current) clearInterval(fetchTimerRef.current);
        if (processTimerRef.current) clearInterval(processTimerRef.current);
        if (statsTimerRef.current) clearInterval(statsTimerRef.current);
        if (uptimeRef.current) clearInterval(uptimeRef.current);
    };

    const handleSettingChange = async (key, value, setter) => {
        setter(value);
        try {
            await updateSetting(key, value.toString());
        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            addActivity(`⚠️ Failed to save setting: ${key}`, 'warning');
        }
    };

    // --- Automation Cycles ---

    const runFetchCycle = async () => {
        if (!autoFetchRef.current) {
            addActivity(`ℹ️ Auto-fetch is disabled`, 'info');
            return;
        }

        setLiveStatus('fetching');
        setNextAction('Fetching new posts...');
        try {
            const result = await fetchPosts();
            setStats(prev => ({ ...prev, postsProcessed: prev.postsProcessed + (result.count || 0) }));

            if (result.message) {
                addActivity(`⚠️ ${result.message}`, 'warning');
            } else if ((result.count || 0) > 0) {
                addActivity(`📥 Fetched ${result.count} new posts`, 'info');
            } else {
                addActivity(`ℹ️ Checked for posts (0 new)`, 'info');
            }

            // Auto-generate comments if enabled
            if (autoGenerateRef.current) {
                addActivity(`🔄 Auto-generate enabled, checking for posts...`, 'info');

                // First, try newly fetched posts
                let postsToProcess = result.posts || [];

                // If no new posts, get existing posts that might need comments
                if (postsToProcess.length === 0) {
                    try {
                        const { getPosts } = await import('../api');
                        const existingPosts = await getPosts(null, 10);
                        if (Array.isArray(existingPosts)) {
                            // Get comments to find posts without comments
                            const allComments = await getComments();
                            const postsWithComments = new Set(
                                Array.isArray(allComments)
                                    ? allComments.map(c => c.post_id)
                                    : []
                            );
                            postsToProcess = existingPosts.filter(p => !postsWithComments.has(p.id)).slice(0, 3);
                            if (postsToProcess.length > 0) {
                                addActivity(`📋 Found ${postsToProcess.length} posts without comments`, 'info');
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching existing posts:', err);
                    }
                }

                // Generate comments for posts
                if (postsToProcess.length > 0) {
                    for (const post of postsToProcess.slice(0, 3)) {
                        if (!post || typeof post.id !== 'number') {
                            console.error('Invalid post object:', post);
                            continue;
                        }
                        try {
                            setLiveStatus('generating');
                            addActivity(`⏳ Generating comment for post #${post.id}...`, 'info');
                            await generateComment(post.id, 'casual', 'medium', false);
                            setStats(prev => ({ ...prev, commentsGenerated: prev.commentsGenerated + 1 }));
                            addActivity(`✨ Generated comment for post #${post.id}`, 'success');
                        } catch (err) {
                            console.error(`Auto-generate error for post ${post.id}:`, err);
                            addActivity(`⚠️ Failed to generate for #${post.id}: ${err.message}`, 'error');
                        }
                    }
                } else {
                    addActivity(`ℹ️ No posts need comment generation`, 'info');
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            addActivity('❌ Failed to fetch posts', 'error');
        }
        setLiveStatus('running');
    };

    const runProcessCycle = async () => {
        setLiveStatus('processing');
        try {
            // Check and process scheduled comments
            const scheduledData = await getScheduledComments();
            if (scheduledData && scheduledData.due_count > 0) {
                setNextAction('Processing scheduled comments...');
                const result = await processScheduledComments();
                setStats(prev => ({ ...prev, commentsPosted: prev.commentsPosted + result.processed_count }));
                addActivity(`📤 Posted ${result.processed_count} scheduled comments`, 'success');
            }

            // Auto-approve pending comments if enabled
            if (autoApproveRef.current) {
                addActivity(`🔄 Checking for pending comments to approve...`, 'info');
                const comments = await getComments('pending');

                if (Array.isArray(comments) && comments.length > 0) {
                    addActivity(`📝 Found ${comments.length} pending comments`, 'info');
                    for (const comment of comments.slice(0, 5)) {
                        try {
                            await updateCommentStatus(comment.id, 'approved');
                            addActivity(`✅ Auto-approved comment #${comment.id}`, 'success');
                        } catch (err) {
                            addActivity(`⚠️ Failed to approve #${comment.id}: ${err.message}`, 'error');
                        }
                    }
                } else {
                    addActivity(`ℹ️ No pending comments to approve`, 'info');
                }
            }

            await loadStats();
        } catch (error) {
            console.error('Process error:', error);
            addActivity(`❌ Process cycle error: ${error.message}`, 'error');
        }
        setLiveStatus('running');
    };

    // --- Start/Stop Logic ---

    const startAutomation = useCallback(() => {
        if (isRunning) return;
        setIsRunning(true);
        setLiveStatus('starting');
        startTimeRef.current = Date.now();
        addActivity('🚀 Automation started', 'success');

        uptimeRef.current = setInterval(() => {
            if (startTimeRef.current) {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setStats(prev => ({ ...prev, uptime: elapsed }));
            }
        }, 1000);

        statsTimerRef.current = setInterval(loadStats, 10000);

        if (autoFetchRef.current) runFetchCycle();
        runProcessCycle();

        fetchTimerRef.current = setInterval(runFetchCycle, fetchInterval * 1000);
        processTimerRef.current = setInterval(runProcessCycle, processInterval * 1000);

        setLiveStatus('running');
    }, [fetchInterval, processInterval, addActivity, isRunning]);

    const stopAutomation = useCallback(() => {
        stopAllTimers();
        setIsRunning(false);
        setLiveStatus('idle');
        setNextAction(null);
        addActivity('⏹️ Automation stopped', 'warning');
    }, [addActivity]);

    const toggleAutomation = () => {
        if (isRunning) {
            stopAutomation();
        } else {
            startAutomation();
        }
    };

    const formatUptime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusIcon = () => {
        switch (liveStatus) {
            case 'running': return <Activity size={16} className="pulse" />;
            case 'fetching': return <RefreshCw size={16} className="spin" />;
            case 'generating': return <Sparkles size={16} className="pulse" />;
            case 'processing': return <Loader size={16} className="spin" />;
            default: return <Power size={16} />;
        }
    };

    return (
        <div className="automation-center">
            {/* Main Control Panel */}
            <div className="glass-card" style={{
                background: isRunning
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1))'
                    : 'var(--glass-bg)',
                border: isRunning ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            background: isRunning ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isRunning ? '#34d399' : 'var(--accent-primary)'
                        }}>
                            <Bot size={28} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Automation Center
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '999px',
                                    background: isRunning ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                    color: isRunning ? '#34d399' : '#9ca3af',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    {getStatusIcon()}
                                    {liveStatus === 'idle' ? 'Stopped' : liveStatus.charAt(0).toUpperCase() + liveStatus.slice(1)}
                                </span>
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {isRunning ? `Running for ${formatUptime(stats.uptime)}` : 'Configure and start automation'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            title={soundEnabled ? 'Mute notifications' : 'Enable sounds'}
                        >
                            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        <button
                            className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
                            onClick={toggleAutomation}
                            style={{
                                minWidth: '140px',
                                background: isRunning ? 'rgba(239, 68, 68, 0.9)' : undefined
                            }}
                        >
                            {isRunning ? (
                                <><Pause size={18} /> Stop</>
                            ) : (
                                <><Play size={18} /> Start Automation</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Live Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <StatCard label="Posts Processed" value={stats.postsProcessed} icon={<Eye size={18} />} color="#60a5fa" />
                    <StatCard label="Comments Generated" value={stats.commentsGenerated} icon={<Sparkles size={18} />} color="#a78bfa" />
                    <StatCard label="Comments Posted" value={stats.commentsPosted} icon={<Send size={18} />} color="#34d399" />
                    <StatCard label="Pending Review" value={pendingCount} icon={<Clock size={18} />} color="#fbbf24" />
                    <StatCard label="Scheduled" value={scheduledCount} icon={<Calendar size={18} />} color="#f472b6" />
                </div>

                {/* Automation Options */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                }}>
                    <ToggleOption
                        label="Auto-Fetch Posts"
                        description="Periodically fetch new posts"
                        checked={autoFetch}
                        onChange={(val) => handleSettingChange('auto_fetch_enabled', val, setAutoFetch)}
                    />
                    <ToggleOption
                        label="Auto-Generate Comments"
                        description="Generate comments for new posts"
                        checked={autoGenerate}
                        onChange={(val) => handleSettingChange('auto_generate_enabled', val, setAutoGenerate)}
                    />
                    <ToggleOption
                        label="Auto-Approve"
                        description="Automatically approve pending"
                        checked={autoApprove}
                        onChange={(val) => handleSettingChange('auto_approve_enabled', val, setAutoApprove)}
                    />
                    <ToggleOption
                        label="Auto-Post"
                        description="Post approved comments"
                        checked={autoPost}
                        onChange={(val) => handleSettingChange('auto_post_enabled', val, setAutoPost)}
                    />
                </div>

                {/* Interval Settings */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Fetch Interval (seconds)
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={fetchInterval}
                            onChange={(e) => setFetchInterval(Math.max(30, parseInt(e.target.value) || 60))}
                            min="30"
                            max="300"
                            disabled={isRunning}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Process Interval (seconds)
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={processInterval}
                            onChange={(e) => setProcessInterval(Math.max(15, parseInt(e.target.value) || 30))}
                            min="15"
                            max="120"
                            disabled={isRunning}
                        />
                    </div>
                </div>
            </div>

            {/* Activity Log */}
            <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} /> Activity Log
                    </h4>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setActivityLog([])}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                    >
                        Clear
                    </button>
                </div>
                <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem'
                }}>
                    {activityLog.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                            No activity yet. Start automation to see logs.
                        </p>
                    ) : (
                        activityLog.map((activity) => (
                            <div
                                key={activity.id}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'center',
                                    fontSize: '0.875rem'
                                }}
                            >
                                <span style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    minWidth: '70px'
                                }}>
                                    {activity.timestamp}
                                </span>
                                <span style={{
                                    color: activity.type === 'error' ? '#f87171' :
                                        activity.type === 'success' ? '#34d399' :
                                            activity.type === 'warning' ? '#fbbf24' :
                                                'var(--text-primary)'
                                }}>
                                    {activity.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style>{`
                .btn-danger {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                }
                .btn-danger:hover {
                    background: linear-gradient(135deg, #dc2626, #b91c1c);
                }
                .pulse {
                    animation: pulse 1.5s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
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

// Stat Card Component
const StatCard = ({ label, value, icon, color }) => (
    <div style={{
        background: 'rgba(0,0,0,0.2)',
        padding: '1rem',
        borderRadius: '0.75rem',
        textAlign: 'center'
    }}>
        <div style={{ color, marginBottom: '0.5rem' }}>{icon}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
    </div>
);

// Toggle Option Component
const ToggleOption = ({ label, description, checked, onChange, disabled }) => (
    <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: checked ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.1)',
        borderRadius: '0.75rem',
        border: checked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s ease'
    }}>
        <div style={{
            width: '40px',
            height: '22px',
            borderRadius: '11px',
            background: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
            position: 'relative',
            transition: 'background 0.3s ease'
        }}>
            <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '2px',
                left: checked ? '20px' : '2px',
                transition: 'left 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
        </div>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => !disabled && onChange(e.target.checked)}
            style={{ display: 'none' }}
        />
        <div>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{description}</div>
        </div>
    </label>
);

export default AutomationCenter;
