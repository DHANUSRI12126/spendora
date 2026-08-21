import React, { useState } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Mail, KeyRound, Lock, X, CheckCircle2, ArrowRight } from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
  const { showToast } = useNotifications();

  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter code & new pass
  const [email, setEmail] = useState(initialEmail);
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast("Please enter your registered email address.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setGeneratedCode(response.data.reset_code);
      setResetCode(response.data.reset_code || '');
      showToast("Verification code generated!", "success");
      setStep(2);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to request reset code.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword) {
      showToast("Please enter code and new password.", "warning");
      return;
    }

    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters.", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        reset_code: resetCode,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      showToast("Password reset successfully! Log in with your new password.", "success");
      onClose();
      // Reset modal state
      setStep(1);
      setNewPassword('');
      setConfirmPassword('');
      setGeneratedCode('');
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reset password.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'zoomIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Send Code */}
        {step === 1 && (
          <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              Enter your registered email address below. We'll generate a password reset verification code for your account.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address*</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}
            >
              {isLoading ? "Generating Code..." : "Send Verification Code"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Step 2: Verification & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {generatedCode && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <CheckCircle2 size={20} style={{ color: 'var(--secondary)' }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>YOUR VERIFICATION CODE</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--secondary)', letterSpacing: '2px' }}>{generatedCode}</strong>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Verification Code*</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter 6-digit code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password*</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password*</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', marginTop: '6px' }}
            >
              {isLoading ? "Resetting Password..." : "Reset Password & Log In"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'center' }}
            >
              ← Change Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
