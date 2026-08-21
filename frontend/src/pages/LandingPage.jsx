import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, 
  TrendingUp, 
  PieChart, 
  Users, 
  Sparkles, 
  Mic, 
  ShieldCheck 
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0a0c10',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1) 0%, rgba(10, 12, 16, 1) 60%)',
    }}>
      {/* Navbar header */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 80px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }} className="landing-nav">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Spendora</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 18px' }}>Log In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px' }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '100px 40px 80px',
        textAlign: 'center',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }} className="hero-section">
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '24px',
          padding: '6px 16px',
          fontSize: '0.82rem',
          color: '#818cf8',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Sparkles size={14} /> AI-Powered Finance Assistant
        </div>
        <h1 style={{
          fontSize: '3.6rem',
          fontWeight: 800,
          lineHeight: 1.15,
          color: '#fff',
          letterSpacing: '-0.03em'
        }} className="hero-title">
          Track Smart. <br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Spend Better.</span> Save More.
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: 'var(--text-secondary)',
          maxWidth: '650px',
          lineHeight: 1.5
        }} className="hero-desc">
          Spendora helps you manage personal expenses, group spending, budgets, and financial goals with intelligent, AI-powered savings recommendations and a voice assistant.
        </p>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }} className="hero-btns">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ padding: '14px 28px', fontSize: '1rem' }}>
              Open Workspace <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                Create Free Account <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: '60px 80px 100px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }} className="features-section">
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '50px',
          color: '#fff'
        }}>Everything you need to master your money</h2>

        <div className="grid-3" style={{ gap: '30px' }}>
          {/* Card 1 */}
          <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Expense Tracking</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Easily record daily transactions. Categorize details like food, shopping, and bills, and inspect them through logs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              color: 'var(--info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieChart size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Smart Budgeting</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Define monthly limits and receive notifications when you reach 70%, 85%, or exceed 100% of your threshold.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Group Sharing</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Split bills with roommates or travel companions. Supports equal, custom, or percentage splits, and calculates optimal settlements.
            </p>
          </div>

          {/* Card 4 */}
          <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>AI Financial Insights</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Get automated reports on spending patterns, saving suggestions, and dynamic 50-30-20 budget split recommendations.
            </p>
          </div>

          {/* Card 5 */}
          <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mic size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Voice Assistant</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Log expenses on the go with simple voice commands like "Add 250 rupees for food", or query: "How much did I spend?"
            </p>
          </div>

          {/* Card 6 */}
          <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Secure & Trusted</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Includes industry-standard JWT session keys, secure salted password hashes, and rigid Role-Based Access Control (RBAC) layers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '40px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p>© 2026 Spendora Inc. All rights reserved. Built for secure and intelligent budget planning.</p>
      </footer>

      {/* Styling adjustments */}
      <style>{`
        @media (max-width: 768px) {
          .landing-nav {
            padding: 20px !important;
          }
          .hero-section {
            padding: 60px 20px 40px !important;
          }
          .hero-title {
            font-size: 2.2rem !important;
          }
          .hero-desc {
            font-size: 1rem !important;
          }
          .hero-btns {
            flex-direction: column;
            width: 100%;
            gap: 10px;
          }
          .hero-btns a {
            width: 100%;
          }
          .features-section {
            padding: 40px 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
