import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, resetSettings, processScheduledComments, getScheduledComments } from '../api';
import { Settings as SettingsIcon, Save, RefreshCw, Clock, Zap, Shield, Bell, RotateCcw } from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({
        rate_limit_per_hour: '15',
        min_delay_seconds: '60',
        max_delay_seconds: '120',
        auto_generate_enabled: 'false',
        auto_post_enabled: 'false',
        default_tone: 'casual',
        default_length: 'medium',
        include_questions: 'true',
        selected_platforms: 'twitter,linkedin,instagram'
    });
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [scheduledInfo, setScheduledInfo] = useState({ due_count: 0 });

    useEffect(() => {
        loadSettings();
        loadScheduledInfo();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadScheduledInfo = async () => {
        try {
            const data = await getScheduledComments();
            setScheduledInfo(data);
        } catch (error) {
            console.error("Error loading scheduled info:", error);
        }
    };

    const handleSave = async (key, value) => {
        try {
            await updateSetting(key, value);
            setSettings({ ...settings, [key]: value });
            setSaveStatus(`✅ ${key.replace(/_/g, ' ')} updated!`);
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error("Error saving setting:", error);
            setSaveStatus(`❌ Failed to update ${key}`);
        }
    };

    const handleReset = async () => {
        if (!window.confirm("Are you sure you want to reset all settings to defaults?")) return;
        try {
            const result = await resetSettings();
            setSettings(result.settings);
            setSaveStatus('✅ All settings reset to defaults!');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error("Error resetting settings:", error);
        }
    };

    const handleProcessScheduled = async () => {
        try {
            const result = await processScheduledComments();
            alert(`✅ Processed ${result.processed_count} scheduled comments!`);
            loadScheduledInfo();
        } catch (error) {
            console.error("Error processing scheduled:", error);
        }
    };

    const SettingCard = ({ title, description, icon: Icon, children }) => (
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                    flexShrink: 0
                }}>
                    <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>{title}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        {description}
                    </p>
                    {children}
                </div>
            </div>
        </div>
    );

    const ToggleSwitch = ({ checked, onChange, label }) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{
                width: '48px',
                height: '26px',
                borderRadius: '13px',
                background: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                position: 'relative',
                transition: 'background 0.3s ease'
            }}>
                <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: checked ? '24px' : '2px',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
            </div>
            <span>{label}</span>
        </label>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>⚙️ Settings</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Configure automation, rate limits, and default preferences.
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={handleReset}>
                    <RotateCcw size={18} /> Reset to Defaults
                </button>
            </div>

            {saveStatus && (
                <div style={{
                    padding: '1rem',
                    background: saveStatus.startsWith('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    color: saveStatus.startsWith('✅') ? '#34d399' : '#f87171'
                }}>
                    {saveStatus}
                </div>
            )}

            {/* Rate Limiting */}
            <SettingCard
                title="Rate Limiting"
                description="Control comment generation rate to avoid platform restrictions and simulate human behavior."
                icon={Shield}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Max Comments per Hour
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={settings.rate_limit_per_hour}
                            onChange={(e) => setSettings({ ...settings, rate_limit_per_hour: e.target.value })}
                            onBlur={() => handleSave('rate_limit_per_hour', settings.rate_limit_per_hour)}
                            min="1"
                            max="60"
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                            Recommended: 10-15 per hour
                        </p>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Min Delay (seconds)
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={settings.min_delay_seconds}
                            onChange={(e) => setSettings({ ...settings, min_delay_seconds: e.target.value })}
                            onBlur={() => handleSave('min_delay_seconds', settings.min_delay_seconds)}
                            min="30"
                            max="300"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Max Delay (seconds)
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={settings.max_delay_seconds}
                            onChange={(e) => setSettings({ ...settings, max_delay_seconds: e.target.value })}
                            onBlur={() => handleSave('max_delay_seconds', settings.max_delay_seconds)}
                            min="60"
                            max="600"
                        />
                    </div>
                </div>
            </SettingCard>

            {/* Default Comment Settings */}
            <SettingCard
                title="Default Comment Generation"
                description="Set default preferences for generated comments."
                icon={SettingsIcon}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Default Tone
                        </label>
                        <select
                            className="input-field"
                            value={settings.default_tone}
                            onChange={(e) => {
                                setSettings({ ...settings, default_tone: e.target.value });
                                handleSave('default_tone', e.target.value);
                            }}
                        >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="supportive">Supportive</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Default Length
                        </label>
                        <select
                            className="input-field"
                            value={settings.default_length}
                            onChange={(e) => {
                                setSettings({ ...settings, default_length: e.target.value });
                                handleSave('default_length', e.target.value);
                            }}
                        >
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ToggleSwitch
                            checked={settings.include_questions === 'true'}
                            onChange={(checked) => {
                                const value = checked ? 'true' : 'false';
                                setSettings({ ...settings, include_questions: value });
                                handleSave('include_questions', value);
                            }}
                            label="Include Questions"
                        />
                    </div>
                </div>
            </SettingCard>

            {/* Automation */}
            <SettingCard
                title="Automation Controls"
                description="Enable automated features. Use with caution and always review content before posting."
                icon={Zap}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#fbbf24' }}>
                            ⚠️ <strong>Important:</strong> Automation features are for demonstration purposes. Always ensure compliance with platform Terms of Service. Never use for spam or inauthentic engagement.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <ToggleSwitch
                            checked={settings.auto_generate_enabled === 'true'}
                            onChange={(checked) => {
                                const value = checked ? 'true' : 'false';
                                setSettings({ ...settings, auto_generate_enabled: value });
                                handleSave('auto_generate_enabled', value);
                            }}
                            label="Auto-generate comments for new posts"
                        />
                        <ToggleSwitch
                            checked={settings.auto_post_enabled === 'true'}
                            onChange={(checked) => {
                                const value = checked ? 'true' : 'false';
                                setSettings({ ...settings, auto_post_enabled: value });
                                handleSave('auto_post_enabled', value);
                            }}
                            label="Auto-post approved comments"
                        />
                    </div>
                </div>
            </SettingCard>

            {/* Scheduled Comments */}
            <SettingCard
                title="Scheduled Comments"
                description="Manage comments that are scheduled for future posting."
                icon={Clock}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{
                        padding: '1rem 2rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '0.5rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {scheduledInfo.due_count}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Comments Due
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleProcessScheduled}
                        disabled={scheduledInfo.due_count === 0}
                    >
                        <Zap size={18} /> Process Due Comments
                    </button>
                    <button className="btn btn-secondary" onClick={loadScheduledInfo}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </SettingCard>

            {/* Platform Selection */}
            <SettingCard
                title="Platform Preferences"
                description="Select which platforms to prioritize for comment generation."
                icon={Bell}
            >
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {['Twitter', 'LinkedIn', 'Instagram'].map((platform) => {
                        const isSelected = settings.selected_platforms.includes(platform.toLowerCase());
                        return (
                            <label
                                key={platform}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.5rem',
                                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        const platforms = settings.selected_platforms.split(',').filter(p => p);
                                        const lower = platform.toLowerCase();
                                        if (e.target.checked) {
                                            if (!platforms.includes(lower)) platforms.push(lower);
                                        } else {
                                            const idx = platforms.indexOf(lower);
                                            if (idx > -1) platforms.splice(idx, 1);
                                        }
                                        const newValue = platforms.join(',');
                                        setSettings({ ...settings, selected_platforms: newValue });
                                        handleSave('selected_platforms', newValue);
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <span style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                    {platform}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </SettingCard>

            {/* Info Card */}
            <div className="glass-card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h4 style={{ margin: 0, marginBottom: '0.5rem', color: '#60a5fa' }}>ℹ️ About This System</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    This AI-powered comment generator uses natural language processing to create contextually relevant,
                    engaging comments. It includes sentiment analysis, platform-specific tone adaptation, and content
                    safety filters. All features are designed for ethical use and platform compliance.
                    <strong style={{ color: 'var(--text-primary)' }}> Always review generated content before posting.</strong>
                </p>
            </div>
        </div>
    );
};

export default Settings;
