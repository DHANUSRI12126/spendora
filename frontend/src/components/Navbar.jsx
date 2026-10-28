import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { Bell, Menu, User, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ toggleSidebar, pageTitle }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { language, languages, changeLanguage } = useLanguage();
  const { currency, currencies, changeCurrency } = useCurrency();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 40px',
      background: 'var(--navbar-bg)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 900
    }} className="app-navbar">
      
      {/* Left side: Hamburger & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={toggleSidebar} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'none'
          }}
          className="mobile-hamburger"
          aria-label="Toggle navigation menu"
        >
          <Menu size={24} />
        </button>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--heading-color)' }}>{pageTitle}</h2>
      </div>

      {/* Right side: Language, Currency, Theme, Voice, Notifications & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Currency Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
            title="Select Currency"
          >
            {Object.values(currencies).map(c => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
            title="Select Language"
          >
            {Object.values(languages).map(l => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Switcher Toggle */}
        <ThemeToggle />

        {/* Quick Voice Shortcut */}
        <button
          onClick={() => navigate('/voice-assistant')}
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          title="Voice Assistant"
        >
          <Mic size={18} />
        </button>

        {/* Notifications Dropdown Container */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: 'var(--danger)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Glassmorphic Dropdown */}
          {showDropdown && (
            <>
              {/* Invisible dismiss background */}
              <div 
                onClick={() => setShowDropdown(false)} 
                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
              />
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '320px',
                background: 'var(--modal-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px var(--glass-shadow)',
                zIndex: 999,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--heading-color)' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => { markAllAsRead(); setShowDropdown(false); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        style={{
                          padding: '12px 18px',
                          borderBottom: '1px solid var(--border-color)',
                          background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => { markAsRead(notif.id); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ 
                            fontWeight: notif.is_read ? 500 : 700, 
                            fontSize: '0.82rem',
                            color: notif.is_read ? 'var(--text-primary)' : 'var(--heading-color)' 
                          }}>
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--primary)'
                            }} />
                          )}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Info Capsule */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--input-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '4px 14px 4px 6px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <User size={16} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user.full_name.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Media styling */}
      <style>{`
        @media (max-width: 1024px) {
          .mobile-hamburger {
            display: block !important;
          }
          .app-navbar {
            padding: 16px 20px !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
