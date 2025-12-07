import React, { useState, useEffect } from 'react';
import { getActivityLogs } from '../api';
import { Clock, Activity, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
        const interval = setInterval(loadLogs, 10000); // Auto refresh
        return () => clearInterval(interval);
    }, []);

    const loadLogs = async () => {
        try {
            const data = await getActivityLogs(50);
            setLogs(data);
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (action) => {
        if (action.includes('error') || action.includes('fail')) return <AlertTriangle size={16} color="#ef4444" />;
        if (action.includes('success') || action.includes('post') || action.includes('approve')) return <CheckCircle size={16} color="#10b981" />;
        return <Info size={16} color="#60a5fa" />;
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity /> System Activity Log
            </h2>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <tr>
                            <th style={{ padding: '1rem', width: '50px' }}></th>
                            <th style={{ padding: '1rem' }}>Action</th>
                            <th style={{ padding: '1rem' }}>Details</th>
                            <th style={{ padding: '1rem', width: '150px' }}>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="hover-row">
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    {getIcon(log.action)}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {log.action.replace(/_/g, ' ').toUpperCase()}
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                    {log.details}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No activity recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .hover-row:hover {
                    background: rgba(255,255,255,0.02);
                }
            `}</style>
        </div>
    );
};

export default ActivityLog;
