import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, BarChart2, Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ReviewQueue from './components/ReviewQueue';
import Analytics from './components/Analytics';

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--accent-gradient)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              💬
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              Social<span style={{ color: 'var(--accent-primary)' }}>AI</span>
            </h1>
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
                <span>Review Queue</span>
              </div>
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} />
                <span>Analytics</span>
              </div>
            </NavLink>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
