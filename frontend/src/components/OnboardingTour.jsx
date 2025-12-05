import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, MessageSquare, BarChart2, Settings, Zap, Bot } from 'lucide-react';

const OnboardingTour = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const steps = [
        {
            title: "Welcome to SocialAI! 🎉",
            description: "Your AI-powered social media comment generator. Let's take a quick tour of the key features.",
            icon: Sparkles,
            color: '#a78bfa',
            tip: "This tool helps you generate engaging, contextual comments for social media posts automatically."
        },
        {
            title: "Dashboard 📊",
            description: "View and manage social media posts. Fetch new posts from platforms or add your own manually.",
            icon: Sparkles,
            color: '#60a5fa',
            tip: "Use 'Fetch New Posts' to get sample data, or 'Add Post' to enter content manually."
        },
        {
            title: "Generate Comments ✨",
            description: "Click 'Generate' on any post to create an AI-powered comment. Customize tone and length!",
            icon: MessageSquare,
            color: '#a78bfa',
            tip: "Try different tones: Professional for LinkedIn, Casual for Twitter, Enthusiastic for Instagram."
        },
        {
            title: "Review Queue 📝",
            description: "Review, edit, approve, or reject generated comments before posting.",
            icon: MessageSquare,
            color: '#34d399',
            tip: "You have full control - nothing gets posted without your approval!"
        },
        {
            title: "Analytics 📈",
            description: "Track your activity, view metrics, and export data for analysis.",
            icon: BarChart2,
            color: '#f472b6',
            tip: "Monitor sentiment scores and engagement metrics over time."
        },
        {
            title: "Quick Actions ⚡",
            description: "Use quick actions for batch operations - fetch, generate, approve, and post with one click!",
            icon: Zap,
            color: '#fbbf24',
            tip: "Perfect for processing multiple posts efficiently."
        },
        {
            title: "Automation Center 🤖",
            description: "Set up automated workflows to fetch posts and generate comments automatically.",
            icon: Bot,
            color: '#34d399',
            tip: "Configure intervals and let the system work for you - with your oversight!"
        },
        {
            title: "You're All Set! 🚀",
            description: "Start by fetching some posts on the Dashboard. Have fun exploring!",
            icon: Sparkles,
            color: '#a78bfa',
            tip: "Remember: Always follow platform guidelines and use responsibly."
        }
    ];

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('socialai-tour-completed');
        if (hasSeenTour) {
            setIsVisible(false);
        }
    }, []);

    const handleComplete = () => {
        localStorage.setItem('socialai-tour-completed', 'true');
        setIsVisible(false);
        if (onComplete) onComplete();
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    if (!isVisible) return null;

    const step = steps[currentStep];
    const Icon = step.icon;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                maxWidth: '500px',
                width: '90%',
                background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95), rgba(20, 20, 35, 0.95))',
                borderRadius: '1.5rem',
                padding: '2rem',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                animation: 'fadeIn 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: idx === currentStep
                                        ? step.color
                                        : idx < currentStep
                                            ? 'rgba(255,255,255,0.5)'
                                            : 'rgba(255,255,255,0.2)',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleSkip}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        Skip <X size={16} />
                    </button>
                </div>

                {/* Icon */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 1.5rem',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${step.color}30, ${step.color}10)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 30px ${step.color}40`
                }}>
                    <Icon size={40} style={{ color: step.color }} />
                </div>

                {/* Content */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{
                        margin: 0,
                        marginBottom: '0.75rem',
                        fontSize: '1.5rem',
                        fontWeight: 700
                    }}>
                        {step.title}
                    </h2>
                    <p style={{
                        margin: 0,
                        color: 'var(--text-secondary)',
                        fontSize: '1rem',
                        lineHeight: 1.6
                    }}>
                        {step.description}
                    </p>
                </div>

                {/* Tip */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                    }}>
                        💡 <strong style={{ color: 'var(--accent-primary)' }}>Tip:</strong> {step.tip}
                    </p>
                </div>

                {/* Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className="btn btn-secondary"
                        style={{
                            opacity: currentStep === 0 ? 0.3 : 1,
                            cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <ChevronLeft size={18} /> Back
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {currentStep + 1} of {steps.length}
                    </span>
                    <button
                        onClick={handleNext}
                        className="btn btn-primary"
                    >
                        {currentStep === steps.length - 1 ? (
                            <>Get Started <Sparkles size={18} /></>
                        ) : (
                            <>Next <ChevronRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default OnboardingTour;

// Reset tour utility
export const resetOnboardingTour = () => {
    localStorage.removeItem('socialai-tour-completed');
    window.location.reload();
};
