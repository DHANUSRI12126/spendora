import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  PiggyBank, 
  Users, 
  BarChart3, 
  Sparkles, 
  Mic, 
  User, 
  Shield, 
  Tag, 
  History, 
  LogOut,
  X
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const userLinks = [
    { to: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/transactions', label: t('transactions'), icon: ArrowRightLeft },
    { to: '/budgets', label: t('budgets'), icon: PiggyBank },
    { to: '/groups', label: t('groups'), icon: Users },
    { to: '/reports', label: t('reports'), icon: BarChart3 },
    { to: '/ai-insights', label: t('aiInsights'), icon: Sparkles },
    { to: '/voice-assistant', label: t('voiceAssistant'), icon: Mic },
    { to: '/profile', label: t('profile'), icon: User }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      <aside 
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '260px',
          background: 'rgba(18, 22, 32, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="sidebar-container"
      >
        {/* Header/Logo */}
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Spendora</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Track Smart. Spend Better.</p>
          </div>
          <button 
            onClick={toggleSidebar} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'none'
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links Navigation */}
        <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
          {/* User Links */}
          <div>
            <p style={{ 
              fontSize: '0.75rem', 
              textTransform: 'uppercase', 
              color: 'var(--text-muted)', 
              fontWeight: 700, 
              paddingLeft: '12px',
              marginBottom: '10px'
            }}>Workspace</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {userLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => { if(window.innerWidth <= 1024) toggleSidebar(); }}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '0.92rem',
                      fontWeight: 500,
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'all 0.2s'
                    })}
                    className="sidebar-link"
                  >
                    <Icon size={18} />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer profile & logout */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {user.full_name}
            </p>
            <span style={{ 
              fontSize: '0.7rem', 
              color: 'var(--text-secondary)',
              fontWeight: 600
            }}>
              {user.email}
            </span>
          </div>
          <button 
            onClick={logout}
            title="Log Out"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'var(--danger)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Embed css rules for desktop sidebar stationary showing */}
      <style>{`
        @media (min-width: 1025px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
          .mobile-close-btn {
            display: none !important;
          }
        }
        @media (max-width: 1024px) {
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
