import React, { useState, useEffect } from 'react';
import { getConnectedAccounts, connectAccount, disconnectAccount, getOAuthStatus, initiateOAuth } from '../api';
import {
    Twitter, Linkedin, Instagram, Plus, Trash2, Check,
    AlertCircle, Link as LinkIcon, ExternalLink, Key, Globe, MessageSquare
} from 'lucide-react';
import { useToast } from './ToastProvider';

const ConnectedAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(null);
    const [formData, setFormData] = useState({ username: '', accessToken: '', mode: 'simulation', clientId: '', clientSecret: '', userAgent: '', subreddit: 'technology', redditUsername: '', redditPassword: '' }); // simulation, api, scraper, oauth
    const [showModal, setShowModal] = useState(null); // 'twitter', 'linkedin', etc.
    const [oauthStatus, setOAuthStatus] = useState(null);
    const { success, error, info } = useToast();

    useEffect(() => {
        loadAccounts();
        loadOAuthStatus();

        // Check for OAuth callback results
        const params = new URLSearchParams(window.location.search);
        if (params.get('oauth_success') === 'true') {
            const platform = params.get('platform');
            const username = params.get('username');
            success(`Successfully connected ${platform} account: @${username}`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            loadAccounts();
        } else if (params.get('oauth_error')) {
            const errorMsg = params.get('oauth_error');
            const platform = params.get('platform');
            error(`OAuth failed for ${platform}: ${errorMsg}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const loadOAuthStatus = async () => {
        try {
            const status = await getOAuthStatus();
            setOAuthStatus(status);
        } catch (err) {
            console.error('Failed to load OAuth status:', err);
        }
    };

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const data = await getConnectedAccounts();
            setAccounts(data);
        } catch (err) {
            console.error('Failed to load accounts:', err);
            error('Failed to load connected accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (e) => {
        e.preventDefault();

        try {
            setConnecting(showModal);
            const platformConfig = supportedPlatforms.find(p => p.id === showModal);

            // Handle OAuth mode - redirect to authorization URL
            if (formData.mode === 'oauth') {
                try {
                    const oauthData = await initiateOAuth(showModal);
                    if (oauthData.authorization_url) {
                        info(`Redirecting to ${platformConfig.name} for authorization...`);
                        // Redirect to OAuth authorization page
                        window.location.href = oauthData.authorization_url;
                        return;
                    }
                } catch (oauthErr) {
                    console.error('OAuth error:', oauthErr);
                    error(oauthErr.response?.data?.detail || 'Failed to initiate OAuth');
                    setConnecting(null);
                    return;
                }
            }

            // Determine token based on mode
            let token = null;
            let username = formData.username;

            if (formData.mode === 'api') token = formData.accessToken;
            if (formData.mode === 'scraper') token = 'scraper';

            // Special handling for Reddit - store credentials as JSON token
            if (showModal === 'reddit') {
                username = formData.subreddit || 'technology';
                token = JSON.stringify({
                    client_id: formData.clientId,
                    client_secret: formData.clientSecret,
                    user_agent: formData.userAgent || 'SocialMediaBot/1.0',
                    subreddit: formData.subreddit || 'technology',
                    username: formData.redditUsername,
                    password: formData.redditPassword
                });
            }

            await connectAccount(platformConfig.name, username, token);

            success(`Successfully connected to ${platformConfig.name}`);
            setFormData({ username: '', accessToken: '', mode: 'simulation', clientId: '', clientSecret: '', userAgent: '', subreddit: 'technology' });
            setShowModal(null);
            loadAccounts();
        } catch (err) {
            console.error('Connect error:', err);
            error(err.response?.data?.detail || 'Failed to connect account');
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async (accountId, platform) => {
        console.log("Attempting to disconnect:", accountId, platform);
        // if (!window.confirm(`Are you sure you want to disconnect this ${platform} account?`)) return;

        try {
            await disconnectAccount(accountId);
            success('Account disconnected successfully');
            loadAccounts();
        } catch (err) {
            console.error('Disconnect error:', err);
            error('Failed to disconnect account');
        }
    };

    const getPlatformIcon = (platform) => {
        switch (platform.toLowerCase()) {
            case 'twitter': return <Twitter size={24} />;
            case 'linkedin': return <Linkedin size={24} />;
            case 'instagram': return <Instagram size={24} />;
            case 'reddit': return <MessageSquare size={24} />;
            default: return <LinkIcon size={24} />;
        }
    };

    const getPlatformColor = (platform) => {
        switch (platform.toLowerCase()) {
            case 'twitter': return '#1DA1F2';
            case 'linkedin': return '#0077B5';
            case 'instagram': return '#E1306C';
            case 'reddit': return '#FF4500';
            default: return '#6B7280';
        }
    };

    const supportedPlatforms = [
        { id: 'twitter', name: 'Twitter', icon: Twitter, color: '#1DA1F2' },
        { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0077B5' },
        { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E1306C' },
        { id: 'reddit', name: 'Reddit', icon: MessageSquare, color: '#FF4500' }
    ];

    return (
        <div className="connected-accounts">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LinkIcon size={24} className="text-gradient" />
                Connected Accounts
            </h3>

            {/* Account List */}
            <div className="grid-layout" style={{ marginBottom: '2rem' }}>
                {supportedPlatforms.map((platform) => {
                    const connected = accounts.filter(a => a.platform.toLowerCase() === platform.id);
                    const isConnected = connected.length > 0;

                    return (
                        <div key={platform.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '4px',
                                height: '100%',
                                background: platform.color
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{
                                    background: `${platform.color}20`,
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    color: platform.color
                                }}>
                                    <platform.icon size={28} />
                                </div>
                                {isConnected ? (
                                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                                        Connected
                                    </span>
                                ) : (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                        onClick={() => setShowModal(platform.id)}
                                    >
                                        <Plus size={14} /> Connect
                                    </button>
                                )}
                            </div>

                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{platform.name}</h4>

                            {isConnected ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                                    {connected.map(acc => (
                                        <div key={acc.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.75rem',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--glass-border)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <img
                                                    src={acc.profile_image_url}
                                                    alt={acc.username}
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{acc.display_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{acc.username}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent duplicate events
                                                    handleDisconnect(acc.id, platform.name);
                                                }}
                                                className="icon-btn"
                                                style={{ width: '28px', height: '28px', color: '#ef4444', zIndex: 10, position: 'relative' }}
                                                title="Disconnect"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="btn btn-secondary"
                                        style={{ width: '100%', fontSize: '0.75rem', marginTop: '0.5rem' }}
                                        onClick={() => setShowModal(platform.id)}
                                    >
                                        <Plus size={14} /> Add Another Account
                                    </button>
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Connect your {platform.name} account to automatically fetch posts and publish comments.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Connection Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setShowModal(null)}>
                    <div
                        className="glass-card"
                        style={{
                            width: '100%',
                            maxWidth: '400px',
                            padding: '2rem',
                            background: 'var(--bg-secondary)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {getPlatformIcon(showModal)}
                            Connect {showModal.charAt(0).toUpperCase() + showModal.slice(1)}
                        </h3>

                        {/* OAuth Quick Connect - Show if configured */}
                        {oauthStatus?.oauth_available && oauthStatus?.platforms?.[showModal]?.configured && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Key size={18} className="text-gradient" />
                                    <strong style={{ fontSize: '0.9rem' }}>Recommended: Connect with OAuth</strong>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                    Securely connect your account using official {showModal.charAt(0).toUpperCase() + showModal.slice(1)} authorization. Your posts will be fetched automatically.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        marginTop: '0.75rem',
                                        background: getPlatformColor(showModal),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onClick={async () => {
                                        setFormData({ ...formData, mode: 'oauth' });
                                        setConnecting(showModal);
                                        try {
                                            const oauthData = await initiateOAuth(showModal);
                                            if (oauthData.authorization_url) {
                                                info(`Redirecting to ${showModal} for authorization...`);
                                                window.location.href = oauthData.authorization_url;
                                            }
                                        } catch (err) {
                                            error(err.response?.data?.detail || 'Failed to initiate OAuth');
                                            setConnecting(null);
                                        }
                                    }}
                                    disabled={connecting}
                                >
                                    <Globe size={16} />
                                    {connecting === showModal ? 'Redirecting...' : `Connect with ${showModal.charAt(0).toUpperCase() + showModal.slice(1)}`}
                                </button>
                            </div>
                        )}

                        {showModal !== 'reddit' && (
                            <>
                                <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    {oauthStatus?.oauth_available && oauthStatus?.platforms?.[showModal]?.configured
                                        ? '— or use alternative methods —'
                                        : 'Choose connection method:'}
                                </div>

                                <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => setFormData({ ...formData, mode: 'simulation' })}
                                        style={{ flex: 1, minWidth: '80px', padding: '0.5rem', border: 'none', background: formData.mode === 'simulation' ? 'var(--primary)' : 'transparent', color: formData.mode === 'simulation' ? 'white' : 'var(--text-secondary)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.7rem' }}>
                                        Simulation
                                    </button>
                                    <button type="button" onClick={() => setFormData({ ...formData, mode: 'scraper' })}
                                        style={{ flex: 1, minWidth: '80px', padding: '0.5rem', border: 'none', background: formData.mode === 'scraper' ? 'var(--primary)' : 'transparent', color: formData.mode === 'scraper' ? 'white' : 'var(--text-secondary)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.7rem' }}>
                                        Browser Scraper
                                    </button>
                                    <button type="button" onClick={() => setFormData({ ...formData, mode: 'api' })}
                                        style={{ flex: 1, minWidth: '80px', padding: '0.5rem', border: 'none', background: formData.mode === 'api' ? 'var(--primary)' : 'transparent', color: formData.mode === 'api' ? 'white' : 'var(--text-secondary)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.7rem' }}>
                                        Manual Token
                                    </button>
                                </div>

                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                    {formData.mode === 'simulation' && "Enter a username to simulate a connection with mock data. Good for testing."}
                                    {formData.mode === 'scraper' && "Uses Selenium to scrape public profile pages. May require manual login."}
                                    {formData.mode === 'api' && "Enter your API Access Token from the developer portal. Enables real post fetching."}
                                </p>
                            </>
                        )}

                        {showModal === 'reddit' && (
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                Enter your Reddit API credentials to fetch posts from subreddits. Create an app at{' '}
                                <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#FF4500' }}>
                                    reddit.com/prefs/apps
                                </a>
                            </p>
                        )}

                        <form onSubmit={handleConnect}>
                            {/* Reddit-specific form */}
                            {showModal === 'reddit' ? (
                                <>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Client ID</label>
                                        <input autoFocus type="text" className="input-field" placeholder="e.g. 40JwTJ-pMvk1w_Uv_3DYYQ"
                                            value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} required />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            Found under your app name at reddit.com/prefs/apps
                                        </p>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Client Secret</label>
                                        <input type="password" className="input-field" placeholder="Your app's secret key"
                                            value={formData.clientSecret} onChange={e => setFormData({ ...formData, clientSecret: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Reddit Username</label>
                                        <input type="text" className="input-field" placeholder="Your Reddit username"
                                            value={formData.redditUsername} onChange={e => setFormData({ ...formData, redditUsername: e.target.value })} />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            Required for posting comments.
                                        </p>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Reddit Password</label>
                                        <input type="password" className="input-field" placeholder="Your Reddit password"
                                            value={formData.redditPassword} onChange={e => setFormData({ ...formData, redditPassword: e.target.value })} />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            Required for posting comments.
                                        </p>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>User Agent</label>
                                        <input type="text" className="input-field" placeholder="e.g. MyBot/1.0 by username"
                                            value={formData.userAgent} onChange={e => setFormData({ ...formData, userAgent: e.target.value })} />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            Optional. A unique identifier for your app.
                                        </p>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label>Subreddit</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '1rem', top: '0.75rem', color: 'var(--text-secondary)' }}>r/</span>
                                            <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="technology"
                                                value={formData.subreddit} onChange={e => setFormData({ ...formData, subreddit: e.target.value })} required />
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            Subreddit to fetch posts from (e.g., technology, programming, news)
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {formData.mode !== 'api' && formData.mode !== 'oauth' && (
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Username</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '1rem', top: '0.75rem', color: 'var(--text-secondary)' }}>@</span>
                                                <input autoFocus type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="username"
                                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                                            </div>
                                        </div>
                                    )}

                                    {formData.mode === 'api' && (
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Access Token (Bearer)</label>
                                            <input autoFocus type="password" className="input-field" placeholder="e.g. AAAAAAAAAAAAAAAAAAAAA..."
                                                value={formData.accessToken} onChange={e => setFormData({ ...formData, accessToken: e.target.value })} required />
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                Get tokens from the platform's developer portal.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary"
                                    disabled={connecting ||
                                        (showModal === 'reddit' ? (!formData.clientId || !formData.clientSecret || !formData.subreddit) :
                                            (formData.mode === 'api' && !formData.accessToken) || (formData.mode !== 'api' && !formData.username))}
                                    style={{ background: getPlatformColor(showModal) }}>
                                    {connecting ? 'Connecting...' : 'Connect Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConnectedAccounts;
