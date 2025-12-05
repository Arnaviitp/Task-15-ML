import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, BarChart2, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ReviewQueue from './components/ReviewQueue';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '45px',
              height: '45px',
              background: 'var(--accent-gradient)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
            }}>
              <Sparkles size={24} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                Social<span style={{ color: 'var(--accent-primary)' }}>AI</span>
              </h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                AI-Powered Comment Generator
              </span>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </div>
            </NavLink>
            <NavLink to="/review" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} />
                <span>Review</span>
              </div>
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} />
                <span>Analytics</span>
              </div>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SettingsIcon size={18} />
                <span>Settings</span>
              </div>
            </NavLink>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        <footer style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginTop: '2rem'
        }}>
          <p style={{ margin: 0 }}>
            🤖 AI-Powered Social Media Comment Generator | Built with FastAPI + React
          </p>
          <p style={{ margin: '0.5rem 0 0' }}>
            ⚠️ For ethical use only. Always follow platform guidelines.
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
