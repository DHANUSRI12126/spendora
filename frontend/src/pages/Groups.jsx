import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Calendar, MessageSquare } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

const Groups = () => {
  const { showToast } = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Group Modal States
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (e) {
      console.error(e);
      showToast("Failed to retrieve sharing groups.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Group name is required.", "warning");
      return;
    }
    try {
      const response = await api.post('/groups', { name, description });
      showToast("Group created successfully", "success");
      setShowModal(false);
      setName('');
      setDescription('');
      fetchGroups();
      
      // Redirect to the new group
      navigate(`/groups/${response.data.group.id}`);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to create group.", "error");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Setup Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>{t('sharedGroups')}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sharedGroupsSubtitle')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} /> {t('confirm')}
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Retrieving group rosters...
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Users size={32} />
          </div>
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No sharing groups yet.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '380px', margin: '0 auto 16px' }}>
            Create a group to share utility bills, trip hotel deposits, or roommate grocery costs with friends.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">Create Your First Group</button>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '24px' }}>
          {groups.map((g) => (
            <div 
              key={g.id} 
              className="card card-hoverable" 
              onClick={() => navigate(`/groups/${g.id}`)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: '16px',
                minHeight: '180px'
              }}
            >
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
                  {g.name}
                </h4>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.4,
                  margin: 0
                }}>
                  {g.description || "No description provided."}
                </p>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '12px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} />
                  <span>{g.member_count} members</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>Created: {new Date(g.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          CREATE GROUP MODAL
      ========================================== */}
      {showModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Create Expense Group</h3>
              <button onClick={() => { setShowModal(false); setName(''); setDescription(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Group Name*</label>
                <input
                  type="text"
                  placeholder="e.g. Friends Trip"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows="3"
                  placeholder="Shared utility bills, hotel split..."
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
