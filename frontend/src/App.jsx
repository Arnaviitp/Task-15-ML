import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, BarChart2, Settings as SettingsIcon,
  Sparkles, Bot, Sun, Moon, HelpCircle, Zap, Bell, X, RefreshCw, Activity, Wand2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ReviewQueue from './components/ReviewQueue';
import Analytics from './components/Analytics';
import ActivityLog from './components/ActivityLog';
import Settings from './components/Settings';
import AutomationCenter from './components/AutomationCenter';
import AITools from './components/AITools';
import QuickActions from './components/QuickActions';
import OnboardingTour, { resetOnboardingTour } from './components/OnboardingTour';
import { ToastProvider, useToast } from './components/ToastProvider';
import { getAnalytics, getComments } from './api';
import ErrorBoundary from './components/ErrorBoundary';

// Notification Badge Component
const NotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;
  return (
    <span style={{
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      background: 'var(--danger)',
      color: 'white',
      fontSize: '0.65rem',
      fontWeight: 700,
      padding: '0.15rem 0.35rem',
      borderRadius: '999px',
      minWidth: '16px',
      textAlign: 'center'
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

// Header with live stats
const AppHeader = ({ darkMode, toggleDarkMode, pendingCount }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);

  return (
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
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          animation: 'pulse 2s ease-in-out infinite'
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

      <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
        </NavLink>
        <NavLink to="/review" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <MessageSquare size={18} />
            <span>Review</span>
            <NotificationBadge count={pendingCount} />
          </div>
        </NavLink>
        <NavLink to="/automation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={18} />
            <span>Automation</span>
          </div>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} />
            <span>Analytics</span>
          </div>
        </NavLink>
        <NavLink to="/ai-tools" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wand2 size={18} />
            <span>AI Tools</span>
          </div>
        </NavLink>
        <NavLink to="/logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} />
            <span>Activity</span>
          </div>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SettingsIcon size={18} />
            <span>Settings</span>
          </div>
        </NavLink>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="icon-btn"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            marginLeft: '0.5rem'
          }}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Help Button */}
        <button
          onClick={resetOnboardingTour}
          className="icon-btn"
          title="Show Tutorial"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          <HelpCircle size={18} />
        </button>
      </nav>
    </header>
  );
};

// Quick Actions Floating Panel
const FloatingQuickActions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const handleNotification = (message, type) => {
    toast[type]?.(message) || toast.info(message);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen ? 'rgba(239, 68, 68, 0.9)' : 'var(--accent-gradient)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          transition: 'all 0.3s ease',
          zIndex: 1000
        }}
        title="Quick Actions"
      >
        {isOpen ? <X size={24} /> : <Zap size={24} />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '6rem',
          left: '2rem',
          width: '320px',
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '1rem',
          padding: '1rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
          zIndex: 999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <QuickActions onNotification={handleNotification} />
        </div>
      )}

      <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
    </>
  );
};

// Main App Content
const AppContent = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const loadPendingCount = useCallback(async () => {
    try {
      const comments = await getComments('pending');
      setPendingCount(comments.length);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  }, []);

  useEffect(() => {
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, [loadPendingCount]);

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`app-container ${darkMode ? 'dark' : 'light'}`}>
      <OnboardingTour />

      <div className="container">
        <AppHeader
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          pendingCount={pendingCount}
        />

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review" element={<ReviewQueue onUpdate={loadPendingCount} />} />
            <Route path="/automation" element={<AutomationCenter />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-tools" element={<AITools />} />
            <Route path="/logs" element={<ActivityLog />} />
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

      <FloatingQuickActions />

      {/* Keyboard Shortcuts Info */}
      <KeyboardShortcuts />
    </div>
  );
};

// Keyboard Shortcuts Handler
const KeyboardShortcuts = () => {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Show shortcuts help with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowHelp(!showHelp);
      }
      // Close with Escape
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  if (!showHelp) return null;

  const shortcuts = [
    { key: '?', description: 'Toggle this help' },
    { key: 'Esc', description: 'Close dialogs' },
    { key: 'R', description: 'Refresh current view' }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(5px)'
    }} onClick={() => setShowHelp(false)}>
      <div style={{
        background: 'rgba(30, 30, 45, 0.95)',
        border: '1px solid var(--glass-border)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%'
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⌨️ Keyboard Shortcuts
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{shortcut.description}</span>
              <kbd style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}>{shortcut.key}</kbd>
            </div>
          ))}
        </div>
        <p style={{
          margin: '1rem 0 0',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          Press Escape or click outside to close
        </p>
      </div>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <Router>
          <AppContent />
        </Router>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
