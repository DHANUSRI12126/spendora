import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { PiggyBank, Plus, Edit3, Trash2, X, AlertTriangle, ShieldCheck } from 'lucide-react';

import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

const Budgets = () => {
  const { showToast } = useNotifications();
  const { formatCurrency, convertInputToINR } = useCurrency();
  const { t, tCategory } = useLanguage();

  // Budgets States
  const [budgets, setBudgets] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBudgetId, setCurrentBudgetId] = useState(null);

  // Form Fields
  const [totalAmount, setTotalAmount] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [categoryBudgets, setCategoryBudgets] = useState({}); // {cat_id: budget_limit}

  const loadBudgetData = async () => {
    setIsLoading(true);
    try {
      // Get all budgets
      const budgetRes = await api.get('/budgets');
      setBudgets(budgetRes.data.budgets || []);

      // Get current month alerts
      const alertRes = await api.get('/budgets/alert');
      setAlertInfo(alertRes.data);

      // Get categories
      const catRes = await api.get('/categories');
      setCategories(catRes.data.categories.filter(c => c.type === 'expense') || []);
    } catch (e) {
      console.error(e);
      showToast("Failed to load budget telemetry.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBudgetData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this monthly budget threshold?")) return;
    try {
      await api.delete(`/budgets/${id}`);
      showToast("Budget threshold deleted.", "success");
      loadBudgetData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete budget.", "error");
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentBudgetId(null);
    setTotalAmount('');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    
    // Reset category budgets
    const initialCats = {};
    categories.forEach(c => { initialCats[c.id] = ''; });
    setCategoryBudgets(initialCats);
    
    setShowModal(true);
  };

  const openEditModal = (b) => {
    setIsEditing(true);
    setCurrentBudgetId(b.id);
    setTotalAmount(b.amount);
    setMonth(b.month);
    setYear(b.year);
    
    // Set category budgets
    const initialCats = {};
    categories.forEach(c => {
      initialCats[c.id] = b.categories_budget?.[c.id] || '';
    });
    setCategoryBudgets(initialCats);
    
    setShowModal(true);
  };

  const handleCategoryBudgetChange = (catId, value) => {
    setCategoryBudgets(prev => ({
      ...prev,
      [catId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!totalAmount) {
      showToast("Please specify the total budget limit.", "warning");
      return;
    }

    // Filter out blank category budgets
    const cleanedCategoryBudgets = {};
    Object.entries(categoryBudgets).forEach(([catId, val]) => {
      if (val && parseFloat(val) > 0) {
        cleanedCategoryBudgets[catId] = convertInputToINR(val);
      }
    });

    const payload = {
      amount: convertInputToINR(totalAmount),
      month: parseInt(month),
      year: parseInt(year),
      categories_budget: cleanedCategoryBudgets
    };

    try {
      if (isEditing) {
        await api.put(`/budgets/${currentBudgetId}`, payload);
        showToast("Monthly budget updated successfully.", "success");
      } else {
        await api.post('/budgets', payload);
        showToast("Monthly budget established successfully.", "success");
      }
      setShowModal(false);
      loadBudgetData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to record budget configuration.", "error");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Current Month Quick Alert Status Bar */}
      {alertInfo && alertInfo.has_budget && (
        <div className="card" style={{
          background: alertInfo.status === 'exceeded' ? 'rgba(239, 68, 68, 0.08)' : alertInfo.status === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${alertInfo.status === 'exceeded' ? 'var(--danger)' : alertInfo.status === 'warning' ? 'var(--accent)' : 'var(--secondary)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px'
        }}>
          {alertInfo.status === 'safe' ? (
            <ShieldCheck size={28} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={28} style={{ color: alertInfo.status === 'exceeded' ? 'var(--danger)' : 'var(--accent)', flexShrink: 0 }} />
          )}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '4px' }}>
              {t('currentMonthStatus')}: {t(alertInfo.status === 'safe' ? 'safeStatus' : alertInfo.status === 'warning' ? 'warningStatus' : 'exceededStatus')}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {t('youHaveSpent')} <b>{formatCurrency(alertInfo.spent)}</b> {t('ofYour')} <b>{formatCurrency(alertInfo.budget)}</b> {t('monthlyLimit')} ({alertInfo.percent_used.toFixed(1)}%).
            </p>
          </div>
        </div>
      )}

      {/* Title & Setup Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{t('monthlyBudget')}</h3>
        <button onClick={openCreateModal} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} /> {t('setBudget')}
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Retrieving budget configurations...
        </div>
      ) : budgets.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>No budgets defined.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Setting up a budget helps you monitor monthly spending categories.</p>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ margin: '0 auto' }}>{t('setBudget')}</button>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '24px' }}>
          {budgets.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PiggyBank size={20} />
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>
                      {new Date(0, b.month - 1).toLocaleString('en', { month: 'long' })} {b.year}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('remaining')}: {formatCurrency(b.amount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEditModal(b)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px' }} title={t('edit')}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="btn btn-danger" style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }} title={t('delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Category Breakdown Details */}
              {b.categories_budget && Object.keys(b.categories_budget).length > 0 ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>Category Caps</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(b.categories_budget).map(([catId, val]) => {
                      const catName = categories.find(c => c.id === parseInt(catId))?.name || 'Unknown';
                      return (
                        <div key={catId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{tCategory(catName)}:</span>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No category-specific caps defined.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          CREATE / EDIT BUDGET MODAL
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
          <div className="card" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>{isEditing ? "Modify Budget" : "Establish Monthly Budget"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Total Monthly Limit (₹)*</label>
                <input
                  type="number"
                  className="form-control"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                  min="1"
                />
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Month*</label>
                  <select
                    className="form-control"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                    disabled={isEditing}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                    disabled={isEditing}
                  />
                </div>
              </div>

              {/* Optional Category-Specific Budgets list */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', marginTop: '6px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '10px' }}>Category-Specific Limits (Optional)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {categories.map((cat) => (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>{cat.name}</span>
                      <input
                        type="number"
                        placeholder="Limit (₹)"
                        value={categoryBudgets[cat.id] || ''}
                        onChange={(e) => handleCategoryBudgetChange(cat.id, e.target.value)}
                        className="form-control"
                        style={{ width: '130px', padding: '8px 12px', fontSize: '0.85rem' }}
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '14px' }}>
                {isEditing ? "Save Budget" : "Establish Budget"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
