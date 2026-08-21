import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Lock, Mail, ArrowLeft, Shield } from 'lucide-react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const Login = () => {
  const { login } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal toggle
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Check if redirected due to expired token session
  const isSessionExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      showToast(`Welcome back, ${loggedUser.full_name}!`, "success");
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err);
      showToast(err, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0c10',
      background: 'radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.1) 0%, rgba(10, 12, 16, 1) 60%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Back Link */}
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          alignSelf: 'flex-start'
        }}>
          <ArrowLeft size={16} /> Back to Landing Page
        </Link>

        {/* Card Panel */}
        <div className="card" style={{ padding: '40px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              marginBottom: '6px'
            }}>
              Spendora Log In
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter your credentials to access your account
            </p>
          </div>

          {/* Session Expiry or Error Alert */}
          {isSessionExpired && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--accent)',
              fontSize: '0.82rem',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              Session expired. Please log in again.
            </div>
          )}

          {errorMsg && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              fontSize: '0.82rem',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div style={{
            marginTop: '24px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)'
          }}>
            <button
              type="button"
              onClick={() => {
                setEmail('john@spendora.com');
                setPassword('password123');
              }}
              style={{
                width: '100%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              👤 Fill Demo User Credentials (john@spendora.com)
            </button>
          </div>
        </div>

        {/* Register CTA */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600 }}>Create an account</Link>
        </p>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />
    </div>
  );
};

export default Login;
