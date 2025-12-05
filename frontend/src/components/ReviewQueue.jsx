import React, { useState, useEffect } from 'react';
import { getComments, updateCommentStatus, updateCommentContent, scheduleComment } from '../api';
import { Check, X, Clock, Edit2, Calendar } from 'lucide-react';

const ReviewQueue = () => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState("");

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await getComments();
            // Filter for pending comments or show all sorted by date
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
            loadComments(); // Refresh list
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleSchedule = async (id) => {
        // Simple prompt for now, could be a date picker modal
        const time = prompt("Enter schedule time (YYYY-MM-DD HH:MM:SS):", new Date().toISOString().slice(0, 19).replace('T', ' '));
        if (time) {
            try {
                await scheduleComment(id, time);
                loadComments();
            } catch (error) {
                console.error("Error scheduling:", error);
                alert("Invalid date format or error scheduling.");
            }
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
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'var(--success)';
            case 'rejected': return 'var(--danger)';
            case 'posted': return 'var(--accent-primary)';
            case 'scheduled': return 'var(--warning)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Review Queue</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Approve, edit, or reject generated comments before posting.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {comments.map((comment) => (
                    <div key={comment.id} className="glass-card animate-fade-in" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>ID: #{comment.id}</span>
                                <span style={{
                                    color: getStatusColor(comment.status),
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'capitalize',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    {comment.status === 'pending' && <Clock size={14} />}
                                    {comment.status === 'scheduled' && <Calendar size={14} />}
                                    {comment.status}
                                </span>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Tone: {comment.tone}
                                </span>
                                {comment.scheduled_at && (
                                    <span style={{ fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
                                        Scheduled: {new Date(comment.scheduled_at).toLocaleString()}
                                    </span>
                                )}
                            </div>

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
                                    <p style={{ margin: 0, fontSize: '1.1rem' }}>"{comment.content}"</p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <span>Sentiment Score: {comment.sentiment_score.toFixed(2)}</span>
                                <span>Created: {new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                        </div>

                        {comment.status === 'pending' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {editingId === comment.id ? (
                                    <>
                                        <button
                                            className="btn"
                                            style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                                            onClick={() => handleSaveEdit(comment.id)}
                                        >
                                            <Check size={18} /> Save
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleCancelEdit}
                                        >
                                            <X size={18} /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="btn"
                                            style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                                            onClick={() => handleStatusUpdate(comment.id, 'approved')}
                                        >
                                            <Check size={18} /> Approve
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                            onClick={() => handleStatusUpdate(comment.id, 'rejected')}
                                        >
                                            <X size={18} /> Reject
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleSchedule(comment.id)}
                                        >
                                            <Calendar size={18} /> Schedule
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleStartEdit(comment)}
                                        >
                                            <Edit2 size={18} /> Edit
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <p>No comments in the queue.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewQueue;
