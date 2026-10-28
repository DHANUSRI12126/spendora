import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { User, Lock, Mail, ShieldAlert, Palette } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useNotifications();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    if (password) {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await updateProfile(fullName, password);
      showToast("Profile details updated successfully.", "success");
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err);
      showToast(err, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title block */}
      <div>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--heading-color)', marginBottom: '4px' }}>Account Settings</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Update your profile name or change your security credentials.</p>
      </div>

      {/* Theme Appearance Card */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Palette size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.98rem', color: 'var(--heading-color)', margin: 0, fontWeight: 600 }}>Interface Theme</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Select light or dark workspace scheme.</p>
          </div>
        </div>
        <div style={{ marginTop: '2px' }}>
          <ThemeToggle variant="pill" />
        </div>
      </div>

      <div className="card" style={{ padding: '30px' }}>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email (Read-Only) */}
          <div className="form-group">
            <label className="form-label">Email Address (Cannot be changed)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={user?.email || ''}
                className="form-control"
                style={{ paddingLeft: '42px', opacity: 0.6, cursor: 'not-allowed' }}
                disabled
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name*</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '42px' }}
                required
              />
            </div>
          </div>

          {/* Password Reset */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--heading-color)', marginBottom: '12px' }}>Change Password (Leave blank to keep current)</h4>
            
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '14px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving changes..." : "Save Settings"}
          </button>
        </form>
      </div>

      {/* Role Notice Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99,102,241,0.04)' }}>
        <ShieldAlert size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Your account is configured with the standard security role <b>{user?.role}</b>.
        </span>
      </div>

    </div>
  );
};

export default Profile;
