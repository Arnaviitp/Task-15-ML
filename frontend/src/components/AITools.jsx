import React, { useState, useEffect } from 'react';
import {
    Sparkles, Zap, Hash, Clock, TrendingUp, User, Smile,
    ChevronDown, Copy, Check, RefreshCw, Star,
    Target, PlusCircle, Trash2, Save, Wand2, Brain, Rocket
} from 'lucide-react';
import { useToast } from './ToastProvider';
import {
    predictEngagement, suggestEmojis, generateHashtags,
    getOptimalPostingTimes, enhanceComment,
    getPersonas, createPersona, deletePersona, setDefaultPersona
} from '../api';

// Animated Background Orbs
const BackgroundOrbs = () => (
    <div className="ai-tools-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
    </div>
);

// Circular Progress Score
const EngagementScore = ({ score, size = 'large' }) => {
    const getColor = () => {
        if (score >= 80) return ['#10b981', '#059669'];
        if (score >= 60) return ['#f59e0b', '#d97706'];
        if (score >= 40) return ['#f97316', '#ea580c'];
        return ['#ef4444', '#dc2626'];
    };
    const [c1, c2] = getColor();
    const circleSize = size === 'large' ? 140 : 70;
    const strokeWidth = size === 'large' ? 10 : 5;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={circleSize} height={circleSize} style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                    <linearGradient id={`scoreGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={c1} />
                        <stop offset="100%" stopColor={c2} />
                    </linearGradient>
                </defs>
                <circle stroke="rgba(255,255,255,0.05)" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={circleSize / 2} cy={circleSize / 2} />
                <circle stroke={`url(#scoreGrad-${score})`} fill="transparent" strokeWidth={strokeWidth} strokeLinecap="round" r={radius} cx={circleSize / 2} cy={circleSize / 2}
                    style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: size === 'large' ? '2rem' : '1rem', fontWeight: 800, background: `linear-gradient(135deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{score}</div>
                {size === 'large' && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '-4px' }}>Score</div>}
            </div>
        </div>
    );
};

// Tool Card Wrapper with Glow Effect
const ToolCard = ({ icon: Icon, title, subtitle, gradient, children }) => (
    <div className="ai-tool-card">
        <div className="ai-tool-card-glow" style={{ background: gradient }} />
        <div className="ai-tool-card-header">
            <div className="ai-tool-icon" style={{ background: gradient }}>
                <Icon size={22} color="white" />
            </div>
            <div>
                <h3 className="ai-tool-title">{title}</h3>
                <p className="ai-tool-subtitle">{subtitle}</p>
            </div>
        </div>
        <div className="ai-tool-content">{children}</div>
    </div>
);

// Engagement Predictor
const EngagementPredictor = () => {
    const [comment, setComment] = useState('');
    const [postContent, setPostContent] = useState('');
    const [platform, setPlatform] = useState('twitter');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handlePredict = async () => {
        if (!comment || !postContent) { toast.warning('Enter both fields'); return; }
        setLoading(true);
        try {
            const result = await predictEngagement(comment, postContent, platform);
            setPrediction(result);
        } catch { toast.error('Prediction failed'); }
        finally { setLoading(false); }
    };

    return (
        <ToolCard icon={Target} title="Engagement Predictor" subtitle="AI-powered performance scoring" gradient="linear-gradient(135deg, #10b981, #059669)">
            <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="Original post content..." className="ai-input" rows={2} />
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Your comment to analyze..." className="ai-input" rows={3} />
            <div className="ai-row">
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="ai-select">
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                </select>
                <button onClick={handlePredict} disabled={loading} className="ai-btn ai-btn-success">
                    {loading ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
                    <span>Analyze</span>
                </button>
            </div>
            {prediction && (
                <div className="ai-result">
                    <div className="ai-result-header">
                        <EngagementScore score={prediction.score} />
                        <div className="ai-result-text">
                            <p className="ai-result-rec">{prediction.recommendation}</p>
                            <div className="ai-factors">
                                {Object.entries(prediction.factors).map(([key, f]) => (
                                    <div key={key} className={`ai-factor ${f.score > 0 ? 'positive' : f.score < 0 ? 'negative' : ''}`}>
                                        <span>{key.replace('_', ' ')}</span>
                                        <span className="ai-factor-score">{f.score > 0 ? '+' : ''}{f.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ToolCard>
    );
};

// Comment Enhancer
const CommentEnhancer = () => {
    const [comment, setComment] = useState('');
    const [platform, setPlatform] = useState('twitter');
    const [options, setOptions] = useState({ emojis: true, hashtags: false, boost: true });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const toast = useToast();

    const handleEnhance = async () => {
        if (!comment) { toast.warning('Enter a comment'); return; }
        setLoading(true);
        try {
            const enhanced = await enhanceComment(comment, platform, options.emojis, options.hashtags, options.boost);
            setResult(enhanced);
        } catch { toast.error('Enhancement failed'); }
        finally { setLoading(false); }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result.enhanced);
        setCopied(true);
        toast.success('Copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <ToolCard icon={Wand2} title="AI Comment Enhancer" subtitle="Transform comments with magic" gradient="linear-gradient(135deg, #8b5cf6, #6366f1)">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter your comment..." className="ai-input" rows={4} />
            <div className="ai-options">
                {[['emojis', '😊 Emojis'], ['hashtags', '# Hashtags'], ['boost', '🚀 Boost']].map(([key, label]) => (
                    <label key={key} className="ai-checkbox">
                        <input type="checkbox" checked={options[key]} onChange={(e) => setOptions({ ...options, [key]: e.target.checked })} />
                        <span>{label}</span>
                    </label>
                ))}
            </div>
            <div className="ai-row">
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="ai-select">
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                </select>
                <button onClick={handleEnhance} disabled={loading} className="ai-btn ai-btn-primary">
                    {loading ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                    <span>Enhance</span>
                </button>
            </div>
            {result && (
                <div className="ai-result ai-result-enhanced">
                    <div className="ai-result-top">
                        <span className="ai-result-label">✨ Enhanced</span>
                        <button onClick={copyToClipboard} className="ai-copy-btn">
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                    <p className="ai-enhanced-text">{result.enhanced}</p>
                    {result.engagement_prediction && (
                        <div className="ai-mini-score">
                            <EngagementScore score={result.engagement_prediction.score} size="small" />
                            <span>Predicted Score</span>
                        </div>
                    )}
                </div>
            )}
        </ToolCard>
    );
};

// Emoji & Hashtag Suggester Combined
const SuggestionTools = () => {
    const [content, setContent] = useState('');
    const [platform, setPlatform] = useState('twitter');
    const [emojis, setEmojis] = useState([]);
    const [hashtags, setHashtags] = useState([]);
    const [loading, setLoading] = useState({ emojis: false, hashtags: false });
    const toast = useToast();

    const loadEmojis = async () => {
        if (!content) return;
        setLoading(l => ({ ...l, emojis: true }));
        try { setEmojis((await suggestEmojis(content, platform, 8)).emojis); }
        catch { toast.error('Failed'); }
        finally { setLoading(l => ({ ...l, emojis: false })); }
    };

    const loadHashtags = async () => {
        if (!content) return;
        setLoading(l => ({ ...l, hashtags: true }));
        try { setHashtags((await generateHashtags(content, platform, 8)).hashtags); }
        catch { toast.error('Failed'); }
        finally { setLoading(l => ({ ...l, hashtags: false })); }
    };

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success(`Copied ${text}`); };

    return (
        <ToolCard icon={Brain} title="Smart Suggestions" subtitle="Emojis & Hashtags powered by AI" gradient="linear-gradient(135deg, #f59e0b, #ea580c)">
            <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe your content..." className="ai-input" />
            <div className="ai-row">
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="ai-select">
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                </select>
                <button onClick={loadEmojis} disabled={loading.emojis} className="ai-btn ai-btn-warning">
                    {loading.emojis ? <RefreshCw size={14} className="spin" /> : <Smile size={14} />}
                    <span>Emojis</span>
                </button>
                <button onClick={loadHashtags} disabled={loading.hashtags} className="ai-btn ai-btn-info">
                    {loading.hashtags ? <RefreshCw size={14} className="spin" /> : <Hash size={14} />}
                    <span>Tags</span>
                </button>
            </div>
            {emojis.length > 0 && (
                <div className="ai-suggestions">
                    <span className="ai-suggestions-label">😊 Emojis</span>
                    <div className="ai-emoji-grid">{emojis.map((e, i) => <button key={i} onClick={() => copy(e)} className="ai-emoji-btn">{e}</button>)}</div>
                </div>
            )}
            {hashtags.length > 0 && (
                <div className="ai-suggestions">
                    <span className="ai-suggestions-label"># Hashtags</span>
                    <div className="ai-hashtag-grid">{hashtags.map((h, i) => <button key={i} onClick={() => copy(h)} className="ai-hashtag-btn">{h}</button>)}</div>
                    <button onClick={() => { navigator.clipboard.writeText(hashtags.join(' ')); toast.success('Copied all!'); }} className="ai-copy-all">Copy All</button>
                </div>
            )}
        </ToolCard>
    );
};

// Optimal Posting Times
const PostingTimes = () => {
    const [platform, setPlatform] = useState('twitter');
    const [times, setTimes] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadTimes(); }, [platform]);

    const loadTimes = async () => {
        setLoading(true);
        try { setTimes(await getOptimalPostingTimes(platform)); }
        catch { }
        finally { setLoading(false); }
    };

    return (
        <ToolCard icon={Clock} title="Best Posting Times" subtitle="Maximize your reach" gradient="linear-gradient(135deg, #ec4899, #be185d)">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="ai-select ai-select-full">
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
            </select>
            {loading ? <div className="ai-loading"><RefreshCw size={24} className="spin" /></div> : times && (
                <div className="ai-times">
                    <div className="ai-time-section">
                        <span className="ai-time-label">📅 Best Days</span>
                        <div className="ai-time-tags">{times.best_days.map((d, i) => <span key={i} className="ai-time-tag green">{d}</span>)}</div>
                    </div>
                    <div className="ai-time-section">
                        <span className="ai-time-label">⏰ Best Hours</span>
                        <div className="ai-time-tags">{times.best_hours.map((h, i) => <span key={i} className="ai-time-tag purple">{h}</span>)}</div>
                    </div>
                    <div className="ai-time-section">
                        <span className="ai-time-label">🚫 Avoid</span>
                        <div className="ai-time-tags">{times.worst_times.map((t, i) => <span key={i} className="ai-time-tag red">{t}</span>)}</div>
                    </div>
                    <p className="ai-insight">💡 {times.insights}</p>
                </div>
            )}
        </ToolCard>
    );
};

// Personas Manager
const PersonasManager = () => {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', tone: 'casual', keywords: [], is_default: false });
    const [kwInput, setKwInput] = useState('');
    const toast = useToast();

    useEffect(() => { load(); }, []);

    const load = async () => { setLoading(true); try { setPersonas(await getPersonas()); } catch { } finally { setLoading(false); } };

    const handleCreate = async () => {
        if (!form.name) { toast.warning('Enter name'); return; }
        try { await createPersona(form); toast.success('Created!'); setShowForm(false); setForm({ name: '', description: '', tone: 'casual', keywords: [], is_default: false }); load(); }
        catch { toast.error('Failed'); }
    };

    const handleDelete = async (id) => { try { await deletePersona(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); } };
    const handleDefault = async (id) => { try { await setDefaultPersona(id); toast.success('Set as default'); load(); } catch { toast.error('Failed'); } };
    const addKw = () => { if (kwInput.trim() && !form.keywords.includes(kwInput.trim())) { setForm({ ...form, keywords: [...form.keywords, kwInput.trim()] }); setKwInput(''); } };

    return (
        <ToolCard icon={User} title="AI Personas" subtitle="Custom generation styles" gradient="linear-gradient(135deg, #06b6d4, #0891b2)">
            <button onClick={() => setShowForm(!showForm)} className="ai-btn ai-btn-outline" style={{ width: '100%', marginBottom: '1rem' }}>
                <PlusCircle size={16} /> {showForm ? 'Cancel' : 'New Persona'}
            </button>
            {showForm && (
                <div className="ai-persona-form">
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Persona name" className="ai-input" />
                    <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="ai-input" />
                    <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} className="ai-select ai-select-full">
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="supportive">Supportive</option>
                    </select>
                    <div className="ai-row">
                        <input type="text" value={kwInput} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKw()} placeholder="Add keywords..." className="ai-input" style={{ flex: 1 }} />
                        <button onClick={addKw} className="ai-btn ai-btn-sm">Add</button>
                    </div>
                    {form.keywords.length > 0 && <div className="ai-keywords">{form.keywords.map((k, i) => <span key={i} className="ai-keyword">{k} <button onClick={() => setForm({ ...form, keywords: form.keywords.filter(x => x !== k) })}>×</button></span>)}</div>}
                    <label className="ai-checkbox"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /><span>Set as default</span></label>
                    <button onClick={handleCreate} className="ai-btn ai-btn-success" style={{ width: '100%' }}><Save size={16} /> Create</button>
                </div>
            )}
            {loading ? <div className="ai-loading"><RefreshCw size={24} className="spin" /></div> : personas.length === 0 ? <p className="ai-empty">No personas yet</p> : (
                <div className="ai-persona-list">
                    {personas.map(p => (
                        <div key={p.id} className={`ai-persona-item ${p.is_default ? 'default' : ''}`}>
                            <div className="ai-persona-info">
                                <span className="ai-persona-name">{p.name} {p.is_default && <span className="ai-default-badge">DEFAULT</span>}</span>
                                <span className="ai-persona-meta">{p.tone} • {p.keywords?.length || 0} keywords</span>
                            </div>
                            <div className="ai-persona-actions">
                                {!p.is_default && <button onClick={() => handleDefault(p.id)} title="Set default"><Star size={14} /></button>}
                                <button onClick={() => handleDelete(p.id)} className="danger" title="Delete"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ToolCard>
    );
};

// Main AI Tools Component
const AITools = () => (
    <div className="ai-tools-page">
        <BackgroundOrbs />
        <div className="ai-tools-header">
            <div className="ai-hero-icon">
                <Rocket size={32} />
            </div>
            <h1 className="ai-hero-title">AI Power Tools</h1>
            <p className="ai-hero-subtitle">Supercharge your social media engagement with intelligent automation</p>
        </div>
        <div className="ai-tools-grid">
            <EngagementPredictor />
            <CommentEnhancer />
            <SuggestionTools />
            <PostingTimes />
            <PersonasManager />
        </div>
        <style>{`
      .ai-tools-page { position: relative; padding: 0 0 3rem; animation: fadeIn 0.5s ease-out; }
      .ai-tools-bg { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: -1; }
      .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; animation: float 20s ease-in-out infinite; }
      .orb-1 { width: 400px; height: 400px; background: #6366f1; top: -100px; left: -100px; }
      .orb-2 { width: 300px; height: 300px; background: #ec4899; bottom: 20%; right: -50px; animation-delay: -5s; }
      .orb-3 { width: 250px; height: 250px; background: #10b981; bottom: -50px; left: 30%; animation-delay: -10s; }
      @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -30px) scale(1.1); } }
      .ai-tools-header { text-align: center; margin-bottom: 3rem; }
      .ai-hero-icon { width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); border-radius: 24px; display: flex; align-items: center; justify-content: center; color: white; animation: pulse 2s ease-in-out infinite; box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4); }
      .ai-hero-title { font-size: 2.5rem; font-weight: 800; margin: 0 0 0.5rem; background: linear-gradient(135deg, #fff, #a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .ai-hero-subtitle { font-size: 1.1rem; color: var(--text-secondary); margin: 0; }
      .ai-tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 1.5rem; }
      .ai-tool-card { position: relative; background: rgba(15, 15, 25, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 1.25rem; padding: 1.5rem; overflow: hidden; transition: all 0.3s ease; }
      .ai-tool-card:hover { border-color: rgba(99, 102, 241, 0.3); transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
      .ai-tool-card-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; opacity: 0.05; filter: blur(60px); pointer-events: none; transition: opacity 0.3s; }
      .ai-tool-card:hover .ai-tool-card-glow { opacity: 0.1; }
      .ai-tool-card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
      .ai-tool-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      .ai-tool-title { font-size: 1.15rem; font-weight: 700; margin: 0; }
      .ai-tool-subtitle { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }
      .ai-tool-content { display: flex; flex-direction: column; gap: 0.75rem; }
      .ai-input { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: var(--text-primary); font-size: 0.875rem; resize: none; transition: all 0.2s; }
      .ai-input:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
      .ai-select { padding: 0.6rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.6rem; color: var(--text-primary); font-size: 0.8rem; cursor: pointer; }
      .ai-select-full { width: 100%; }
      .ai-row { display: flex; gap: 0.75rem; align-items: center; }
      .ai-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem; border: none; border-radius: 0.6rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
      .ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .ai-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); }
      .ai-btn-success { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
      .ai-btn-warning { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
      .ai-btn-info { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
      .ai-btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--text-primary); }
      .ai-btn-sm { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
      .ai-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
      .ai-options { display: flex; flex-wrap: wrap; gap: 0.75rem; }
      .ai-checkbox { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.8rem; }
      .ai-checkbox input { accent-color: var(--accent-primary); }
      .ai-result { background: rgba(255,255,255,0.03); border-radius: 0.75rem; padding: 1rem; margin-top: 0.5rem; }
      .ai-result-header { display: flex; gap: 1.25rem; align-items: flex-start; }
      .ai-result-text { flex: 1; }
      .ai-result-rec { font-size: 0.9rem; font-weight: 500; margin: 0 0 0.75rem; }
      .ai-factors { display: flex; flex-direction: column; gap: 0.4rem; }
      .ai-factor { display: flex; justify-content: space-between; padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 0.75rem; text-transform: capitalize; }
      .ai-factor.positive { background: rgba(16, 185, 129, 0.1); }
      .ai-factor.negative { background: rgba(239, 68, 68, 0.1); }
      .ai-factor-score { font-weight: 600; }
      .ai-factor.positive .ai-factor-score { color: #10b981; }
      .ai-factor.negative .ai-factor-score { color: #ef4444; }
      .ai-result-enhanced { border: 1px solid rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.08); }
      .ai-result-top { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
      .ai-result-label { font-size: 0.7rem; color: #a78bfa; font-weight: 600; }
      .ai-copy-btn { background: none; border: none; color: var(--accent-primary); cursor: pointer; }
      .ai-enhanced-text { margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; }
      .ai-mini-score { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-secondary); }
      .ai-suggestions { margin-top: 0.5rem; }
      .ai-suggestions-label { font-size: 0.7rem; color: var(--text-secondary); display: block; margin-bottom: 0.4rem; }
      .ai-emoji-grid, .ai-hashtag-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .ai-emoji-btn { font-size: 1.4rem; padding: 0.4rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; }
      .ai-emoji-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.1); }
      .ai-hashtag-btn { padding: 0.3rem 0.6rem; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 999px; color: #60a5fa; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
      .ai-hashtag-btn:hover { background: rgba(59, 130, 246, 0.25); }
      .ai-copy-all { background: none; border: none; color: var(--accent-primary); font-size: 0.7rem; cursor: pointer; margin-top: 0.5rem; }
      .ai-loading { display: flex; justify-content: center; padding: 2rem; color: var(--text-secondary); }
      .ai-times { display: flex; flex-direction: column; gap: 1rem; }
      .ai-time-section { }
      .ai-time-label { font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.4rem; }
      .ai-time-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .ai-time-tag { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.7rem; }
      .ai-time-tag.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      .ai-time-tag.purple { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
      .ai-time-tag.red { background: rgba(239, 68, 68, 0.15); color: #f87171; }
      .ai-insight { font-size: 0.8rem; color: var(--text-secondary); font-style: italic; background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 0.5rem; margin: 0; }
      .ai-persona-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 0.75rem; margin-bottom: 1rem; }
      .ai-keywords { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .ai-keyword { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: rgba(99, 102, 241, 0.15); border-radius: 999px; font-size: 0.7rem; }
      .ai-keyword button { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 0.9rem; }
      .ai-empty { text-align: center; color: var(--text-secondary); padding: 1.5rem; font-size: 0.875rem; }
      .ai-persona-list { display: flex; flex-direction: column; gap: 0.5rem; }
      .ai-persona-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(255,255,255,0.02); border-radius: 0.5rem; border: 1px solid transparent; transition: all 0.2s; }
      .ai-persona-item.default { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.2); }
      .ai-persona-info { }
      .ai-persona-name { font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
      .ai-default-badge { background: var(--accent-primary); color: white; font-size: 0.55rem; padding: 0.15rem 0.4rem; border-radius: 999px; }
      .ai-persona-meta { font-size: 0.7rem; color: var(--text-secondary); display: block; margin-top: 0.2rem; }
      .ai-persona-actions { display: flex; gap: 0.4rem; }
      .ai-persona-actions button { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.3rem; transition: color 0.2s; }
      .ai-persona-actions button:hover { color: var(--accent-primary); }
      .ai-persona-actions button.danger:hover { color: #ef4444; }
      @media (max-width: 768px) { .ai-tools-grid { grid-template-columns: 1fr; } .ai-hero-title { font-size: 1.8rem; } }
    `}</style>
    </div>
);

export default AITools;
