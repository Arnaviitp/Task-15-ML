import React, { useState, useEffect } from 'react';
import { getComments, updateCommentStatus, updateCommentContent, scheduleComment, deleteComment, simulatePostComment } from '../api';
import { Check, X, Clock, Edit2, Calendar, Trash2, Send, Filter, RefreshCw } from 'lucide-react';

const ReviewQueue = () => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [statusFilter, setStatusFilter] = useState('all');
    const [schedulingId, setSchedulingId] = useState(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await getComments();
            setComments(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateCommentStatus(id, status);
            loadComments();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleScheduleOpen = (comment) => {
        setSchedulingId(comment.id);
        const now = new Date();
        now.setHours(now.getHours() + 1);
        setScheduleDate(now.toISOString().split('T')[0]);
        setScheduleTime(now.toTimeString().slice(0, 5));
    };

    const handleScheduleSubmit = async (id) => {
        if (!scheduleDate || !scheduleTime) {
            alert("Please select both date and time");
            return;
        }
        const scheduledTime = `${scheduleDate}T${scheduleTime}:00`;
        try {
            await scheduleComment(id, scheduledTime);
            setSchedulingId(null);
            loadComments();
        } catch (error) {
            console.error("Error scheduling:", error);
            alert("Error: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleStartEdit = (comment) => {
        setEditingId(comment.id);
        setEditContent(comment.content);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent("");
    };

    const handleSaveEdit = async (id) => {
        try {
            await updateCommentContent(id, editContent);
            setEditingId(null);
            setEditContent("");
            loadComments();
        } catch (error) {
            console.error("Error saving edit:", error);
            alert("Error: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            await deleteComment(id);
            loadComments();
        } catch (error) {
            console.error("Error deleting:", error);
        }
    };

    const handleSimulatePost = async (id) => {
        try {
            await simulatePostComment(id);
            alert("✅ Comment posted successfully (simulated)!");
            loadComments();
        } catch (error) {
            console.error("Error posting:", error);
            alert("Error: " + (error.response?.data?.detail || error.message));
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' };
            case 'rejected': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171' };
            case 'posted': return { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' };
            case 'scheduled': return { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' };
            default: return { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' };
        }
    };

    const getSentimentEmoji = (score) => {
        if (score >= 0.5) return '😊';
        if (score >= 0.1) return '🙂';
        if (score >= -0.1) return '😐';
        if (score >= -0.5) return '😕';
        return '😢';
    };

    const filteredComments = statusFilter === 'all'
        ? comments
        : comments.filter(c => c.status === statusFilter);

    const statusCounts = {
        all: comments.length,
        pending: comments.filter(c => c.status === 'pending').length,
        approved: comments.filter(c => c.status === 'approved').length,
        scheduled: comments.filter(c => c.status === 'scheduled').length,
        posted: comments.filter(c => c.status === 'posted').length,
        rejected: comments.filter(c => c.status === 'rejected').length,
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📝 Review Queue</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Approve, edit, schedule, or reject generated comments. {filteredComments.length} comments shown.
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={loadComments} disabled={loading}>
                    <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {Object.entries(statusCounts).map(([status, count]) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: statusFilter === status ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                            background: statusFilter === status ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: statusFilter === status ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textTransform: 'capitalize',
                            fontSize: '0.875rem',
                            fontWeight: statusFilter === status ? 600 : 400
                        }}
                    >
                        {status}
                        <span style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem'
                        }}>
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredComments.map((comment) => {
                    const statusStyle = getStatusColor(comment.status);
                    return (
                        <div key={comment.id} className="glass-card animate-fade-in">
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                {/* Main Content */}
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                        <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                            #{comment.id}
                                        </span>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            background: statusStyle.bg,
                                            color: statusStyle.color,
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            {comment.status === 'pending' && <Clock size={12} />}
                                            {comment.status === 'scheduled' && <Calendar size={12} />}
                                            {comment.status === 'approved' && <Check size={12} />}
                                            {comment.status === 'posted' && <Send size={12} />}
                                            {comment.status}
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px'
                                        }}>
                                            {comment.tone} • {comment.length}
                                        </span>
                                        {comment.has_question && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                                                ❓ Has question
                                            </span>
                                        )}
                                    </div>

                                    {/* Comment Content */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        marginBottom: '1rem'
                                    }}>
                                        {editingId === comment.id ? (
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="input-field"
                                                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                                            />
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>
                                                "{comment.content}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Scheduling Form */}
                                    {schedulingId === comment.id && (
                                        <div style={{
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            padding: '1rem',
                                            borderRadius: '0.5rem',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'flex-end',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Date</label>
                                                <input
                                                    type="date"
                                                    value={scheduleDate}
                                                    onChange={(e) => setScheduleDate(e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Time</label>
                                                <input
                                                    type="time"
                                                    value={scheduleTime}
                                                    onChange={(e) => setScheduleTime(e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <button className="btn btn-primary" onClick={() => handleScheduleSubmit(comment.id)}>
                                                <Calendar size={16} /> Confirm Schedule
                                            </button>
                                            <button className="btn btn-secondary" onClick={() => setSchedulingId(null)}>
                                                Cancel
                                            </button>
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                        <span title="Sentiment score">
                                            {getSentimentEmoji(comment.sentiment_score)} Sentiment: {comment.sentiment_score.toFixed(2)}
                                        </span>
                                        <span>
                                            📅 Created: {new Date(comment.created_at).toLocaleString()}
                                        </span>
                                        {comment.scheduled_at && (
                                            <span style={{ color: '#fbbf24' }}>
                                                ⏰ Scheduled: {new Date(comment.scheduled_at).toLocaleString()}
                                            </span>
                                        )}
                                        {comment.posted_at && (
                                            <span style={{ color: '#60a5fa' }}>
                                                ✅ Posted: {new Date(comment.posted_at).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                                    {editingId === comment.id ? (
                                        <>
                                            <button
                                                className="btn"
                                                style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                                                onClick={() => handleSaveEdit(comment.id)}
                                            >
                                                <Check size={16} /> Save
                                            </button>
                                            <button className="btn btn-secondary" onClick={handleCancelEdit}>
                                                <X size={16} /> Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {comment.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="btn"
                                                        style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                                                        onClick={() => handleStatusUpdate(comment.id, 'approved')}
                                                    >
                                                        <Check size={16} /> Approve
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                                        onClick={() => handleStatusUpdate(comment.id, 'rejected')}
                                                    >
                                                        <X size={16} /> Reject
                                                    </button>
                                                    <button className="btn btn-secondary" onClick={() => handleScheduleOpen(comment)}>
                                                        <Calendar size={16} /> Schedule
                                                    </button>
                                                    <button className="btn btn-secondary" onClick={() => handleStartEdit(comment)}>
                                                        <Edit2 size={16} /> Edit
                                                    </button>
                                                </>
                                            )}
                                            {comment.status === 'approved' && (
                                                <>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => handleSimulatePost(comment.id)}
                                                    >
                                                        <Send size={16} /> Post Now
                                                    </button>
                                                    <button className="btn btn-secondary" onClick={() => handleScheduleOpen(comment)}>
                                                        <Calendar size={16} /> Schedule
                                                    </button>
                                                </>
                                            )}
                                            {(comment.status === 'pending' || comment.status === 'approved') && (
                                                <button
                                                    className="btn"
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                                    onClick={() => handleDelete(comment.id)}
                                                >
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredComments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📭 No comments found</p>
                        <p>Go to Dashboard to generate comments for posts.</p>
                    </div>
                )}
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ReviewQueue;
