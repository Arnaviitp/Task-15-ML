import React, { useState, useEffect } from 'react';
import { fetchPosts, getPosts, generateComment } from '../api';
import { RefreshCw, Send, Loader } from 'lucide-react';

const Dashboard = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(null);
    const [includeQuestion, setIncludeQuestion] = useState(false);
    const [manualPostContent, setManualPostContent] = useState("");

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
            setLoading(false);
        }
    };

    const handleGenerate = async (postId) => {
        setGenerating(postId);
        try {
            await generateComment(postId, "casual", "medium", includeQuestion);
            alert("Comment generated! Check Review Queue.");
        } catch (error) {
            console.error("Error generating comment:", error);
            alert("Error: " + (error.response?.data?.detail || error.message));
        } finally {
            setGenerating(null);
        }
    };

    const handleManualPost = async () => {
        if (!manualPostContent) return;

        setLoading(true);
        try {
            const { createPost } = await import('../api');

            await createPost({
                platform: "Manual",
                content: manualPostContent,
                author: "User",
                url: "manual-" + Date.now()
            });

            setManualPostContent("");
            await loadPosts();
            alert("Post added successfully!");
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post.");
        } finally {
            setLoading(false);
        }
    };

    const getPlatformBadge = (platform) => {
        const p = platform.toLowerCase();
        return <span className={`badge badge-${p}`}>{platform}</span>;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Active Posts</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Analyze and engage with recent social media activity.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        Refresh Feed
                    </button>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0 }}>Simulation Controls</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={includeQuestion}
                            onChange={(e) => setIncludeQuestion(e.target.checked)}
                        />
                        Include Question in Comment
                    </label>

                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Paste post URL or content to simulate fetch..."
                            value={manualPostContent}
                            onChange={(e) => setManualPostContent(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" onClick={handleManualPost}>Simulate Fetch</button>
                    </div>
                </div>
            </div>

            <div className="grid-layout">
                {posts.map((post) => (
                    <div key={post.id} className="glass-card animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            {getPlatformBadge(post.platform)}
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {new Date(post.fetched_at).toLocaleDateString()}
                            </span>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#334155' }}></div>
                                <span style={{ fontWeight: 600 }}>{post.author}</span>
                            </div>
                            <p style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>{post.content}</p>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => handleGenerate(post.id)}
                                disabled={generating === post.id}
                            >
                                {generating === post.id ? (
                                    <>
                                        <Loader size={18} className="spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} /> Generate Comment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default Dashboard;
