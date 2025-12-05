import React, { useState, useEffect } from 'react';
import { fetchPosts, getPosts, generateComment, createPost, generateVariations } from '../api';
import { RefreshCw, Send, Loader, Plus, Sparkles, Hash, Heart, MessageCircle, Share2, User } from 'lucide-react';

const Dashboard = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(null);
    const [showVariations, setShowVariations] = useState(null);
    const [variations, setVariations] = useState([]);

    // Comment Generation Settings
    const [settings, setSettings] = useState({
        tone: 'casual',
        length: 'medium',
        includeQuestion: false
    });

    // Manual Post Form
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualPost, setManualPost] = useState({
        platform: 'Twitter',
        content: '',
        author: 'User',
        url: ''
    });

    // Platform filter
    const [platformFilter, setPlatformFilter] = useState('all');

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await getPosts();
            setPosts(data);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await fetchPosts();
            await loadPosts();
        } catch (error) {
            console.error("Error refreshing feed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (postId) => {
        setGenerating(postId);
        try {
            await generateComment(postId, settings.tone, settings.length, settings.includeQuestion);
            alert("✅ Comment generated! Check Review Queue.");
        } catch (error) {
            console.error("Error generating comment:", error);
            alert("❌ Error: " + (error.response?.data?.detail || error.message));
        } finally {
            setGenerating(null);
        }
    };

    const handleGenerateVariations = async (postId) => {
        setShowVariations(postId);
        try {
            const result = await generateVariations(postId, 3, settings.tone);
            setVariations(result.variations);
        } catch (error) {
            console.error("Error generating variations:", error);
            setVariations([]);
        }
    };

    const handleManualPost = async () => {
        if (!manualPost.content) return;
        setLoading(true);
        try {
            await createPost({
                ...manualPost,
                url: manualPost.url || `manual-${Date.now()}`,
                hashtags: manualPost.content.match(/#(\w+)/g)?.map(h => h.slice(1)) || [],
                mentions: manualPost.content.match(/@(\w+)/g)?.map(m => m.slice(1)) || []
            });
            setManualPost({ platform: 'Twitter', content: '', author: 'User', url: '' });
            setShowManualForm(false);
            await loadPosts();
            alert("✅ Post added successfully!");
        } catch (error) {
            console.error("Error creating post:", error);
            alert("❌ Failed to create post.");
        } finally {
            setLoading(false);
        }
    };

    const getPlatformBadge = (platform) => {
        const p = platform.toLowerCase();
        const colors = {
            twitter: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)',
            linkedin: 'linear-gradient(135deg, #0077B5, #005885)',
            instagram: 'linear-gradient(135deg, #E1306C, #C13584, #833AB4)',
            manual: 'linear-gradient(135deg, #6B7280, #4B5563)'
        };
        return (
            <span className="badge" style={{ background: colors[p] || colors.manual }}>
                {platform}
            </span>
        );
    };

    const filteredPosts = platformFilter === 'all'
        ? posts
        : posts.filter(p => p.platform.toLowerCase() === platformFilter);

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📊 Active Posts</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Analyze and engage with social media content. {posts.length} posts loaded.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowManualForm(!showManualForm)}>
                        <Plus size={18} /> Add Post
                    </button>
                    <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        Fetch New Posts
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} /> Comment Generation Settings
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Tone
                        </label>
                        <select
                            className="input-field"
                            value={settings.tone}
                            onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                        >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="supportive">Supportive</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Length
                        </label>
                        <select
                            className="input-field"
                            value={settings.length}
                            onChange={(e) => setSettings({ ...settings, length: e.target.value })}
                        >
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Platform Filter
                        </label>
                        <select
                            className="input-field"
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                        >
                            <option value="all">All Platforms</option>
                            <option value="twitter">Twitter</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="instagram">Instagram</option>
                            <option value="manual">Manual</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.includeQuestion}
                                onChange={(e) => setSettings({ ...settings, includeQuestion: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span>Include Question</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Manual Post Form */}
            {showManualForm && (
                <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginTop: 0 }}>➕ Add Manual Post</h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Platform</label>
                                <select
                                    className="input-field"
                                    value={manualPost.platform}
                                    onChange={(e) => setManualPost({ ...manualPost, platform: e.target.value })}
                                >
                                    <option value="Twitter">Twitter</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Manual">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Author</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={manualPost.author}
                                    onChange={(e) => setManualPost({ ...manualPost, author: e.target.value })}
                                    placeholder="Author name"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>URL (optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={manualPost.url}
                                    onChange={(e) => setManualPost({ ...manualPost, url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Content</label>
                            <textarea
                                className="input-field"
                                value={manualPost.content}
                                onChange={(e) => setManualPost({ ...manualPost, content: e.target.value })}
                                placeholder="Paste or type the post content here... Include #hashtags and @mentions"
                                style={{ minHeight: '100px', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowManualForm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleManualPost} disabled={!manualPost.content || loading}>
                                <Plus size={18} /> Add Post
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Posts Grid */}
            <div className="grid-layout">
                {filteredPosts.map((post) => (
                    <div key={post.id} className="glass-card animate-fade-in">
                        {/* Post Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            {getPlatformBadge(post.platform)}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {new Date(post.fetched_at).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Author & Content */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <User size={16} />
                                </div>
                                <span style={{ fontWeight: 600 }}>{post.author}</span>
                            </div>
                            <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
                                {post.content}
                            </p>
                        </div>

                        {/* Hashtags */}
                        {post.hashtags && post.hashtags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                {post.hashtags.slice(0, 5).map((tag, i) => (
                                    <span key={i} style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        borderRadius: '4px',
                                        color: '#60a5fa',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        <Hash size={12} /> {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Engagement Metrics */}
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            padding: '0.75rem 0',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Heart size={14} /> {post.likes || 0}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MessageCircle size={14} /> {post.comments_count || 0}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Share2 size={14} /> {post.shares || 0}
                            </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => handleGenerate(post.id)}
                                disabled={generating === post.id}
                            >
                                {generating === post.id ? (
                                    <><Loader size={18} className="spin" /> Generating...</>
                                ) : (
                                    <><Send size={18} /> Generate</>
                                )}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleGenerateVariations(post.id)}
                                title="Generate multiple variations"
                            >
                                <Sparkles size={18} />
                            </button>
                        </div>

                        {/* Variations Modal */}
                        {showVariations === post.id && variations.length > 0 && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <strong>Comment Variations</strong>
                                    <button
                                        onClick={() => { setShowVariations(null); setVariations([]); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                {variations.map((v, i) => (
                                    <div key={i} style={{
                                        padding: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '4px',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            #{v.variation} • {v.length} • {v.has_question ? 'with question' : 'no question'}
                                        </div>
                                        "{v.comment}"
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {filteredPosts.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <p>No posts found. Click "Fetch New Posts" to load sample data.</p>
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

export default Dashboard;
