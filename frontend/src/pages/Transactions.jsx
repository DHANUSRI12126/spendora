import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit2, 
  ArrowUpDown, 
  X,
  TrendingUp,
  TrendingDown,
  Plus,
  Camera
} from 'lucide-react';

import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import ReceiptScannerModal from '../components/ReceiptScannerModal';

const getTodayDateStr = () => new Date().toLocaleDateString('en-CA');

const getCategoryStyle = (catName) => {
  const name = (catName || '').toLowerCase();
  if (name.includes('food') || name.includes('grocer') || name.includes('restaur')) {
    return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('transport') || name.includes('fuel') || name.includes('cab') || name.includes('uber')) {
    return { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('shop') || name.includes('store') || name.includes('amazon')) {
    return { background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('bill') || name.includes('utilit') || name.includes('electr')) {
    return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('entertain') || name.includes('movi') || name.includes('media')) {
    return { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('health') || name.includes('medic') || name.includes('doctor')) {
    return { background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('educat') || name.includes('book') || name.includes('course')) {
    return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('travel') || name.includes('hotel') || name.includes('flight')) {
    return { background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('rent') || name.includes('house') || name.includes('apart')) {
    return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  if (name.includes('salar') || name.includes('incom') || name.includes('freelanc') || name.includes('gift') || name.includes('business')) {
    return { background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
  }
  return { background: 'rgba(99, 102, 241, 0.12)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 600 };
};

const Transactions = () => {
  const { showToast } = useNotifications();
  const { formatCurrency, convertInputToINR } = useCurrency();
  const { t, tCategory } = useLanguage();

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scanner Modal State
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handleScanComplete = (scanned) => {
    const catId = scanned.category_id || categories[0]?.id || 16;

    setExpenseForm({
      amount: scanned.amount || '',
      category_id: catId,
      description: scanned.merchant || scanned.description || `Expense (${scanned.category || 'Other'})`,
      date: scanned.date || getTodayDateStr(),
      payment_method: scanned.payment_method || 'UPI',
      notes: scanned.summary || ''
    });
    setShowExpenseModal(true);
  };

  // Filters State
  const [search, setSearch] = useState('');
  const [type, setType] = useState(''); // 'income', 'expense', or '' (All)
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Add Transaction Modal States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category_id: '',
    date: getTodayDateStr(),
    payment_method: 'UPI',
    description: '',
    notes: ''
  });

  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    source: 'Salary',
    date: getTodayDateStr(),
    description: '',
    notes: ''
  });

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (type) params.type = type;
      if (categoryId) params.category_id = categoryId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      params.sort_by = sortBy;
      params.sort_order = sortOrder;

      const response = await api.get('/expenses/unified', { params });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error("Failed to load transactions list:", error);
      showToast("Could not retrieve transactions timeline.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [search, type, categoryId, startDate, endDate, sortBy, sortOrder]);

  const handleDelete = async (txId, txType) => {
    if (!window.confirm("Are you sure you want to delete this transaction record?")) return;
    try {
      if (txType === 'income') {
        await api.delete(`/income/${txId}`);
      } else {
        await api.delete(`/expenses/${txId}`);
      }
      showToast("Transaction deleted successfully.", "success");
      fetchTransactions();
    } catch (error) {
      showToast(error.response?.data?.message || "Deletion failed.", "error");
    }
  };

  const openEditModal = (tx) => {
    setEditingTx({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      name: tx.name,
      date: tx.date,
      description: tx.description || '',
      category_id: tx.category_id || '',
      payment_method: tx.payment_method || 'UPI',
      notes: tx.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTx.amount || !editingTx.name || !editingTx.date) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    try {
      if (editingTx.type === 'income') {
        await api.put(`/income/${editingTx.id}`, {
          amount: editingTx.amount,
          source: editingTx.name,
          date: editingTx.date,
          description: editingTx.description,
          notes: editingTx.notes
        });
      } else {
        await api.put(`/expenses/${editingTx.id}`, {
          amount: editingTx.amount,
          category_id: editingTx.category_id,
          date: editingTx.date,
          payment_method: editingTx.payment_method,
          description: editingTx.name,
          notes: editingTx.notes
        });
      }

      showToast("Transaction updated successfully.", "success");
      setShowEditModal(false);
      setEditingTx(null);
      fetchTransactions();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to update record.", "error");
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.category_id || !expenseForm.description) {
      showToast("Please fill all required expense fields.", "warning");
      return;
    }
    try {
      const payload = {
        ...expenseForm,
        amount: convertInputToINR(expenseForm.amount)
      };
      await api.post('/expenses', payload);
      showToast("Expense recorded successfully", "success");
      setShowExpenseModal(false);
      setExpenseForm({
        amount: '',
        category_id: '',
        date: getTodayDateStr(),
        payment_method: 'UPI',
        description: '',
        notes: ''
      });
      fetchTransactions();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to add expense.", "error");
    }
  };

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!incomeForm.amount || !incomeForm.source || !incomeForm.date) {
      showToast("Please fill all required income fields.", "warning");
      return;
    }
    try {
      const payload = {
        ...incomeForm,
        amount: convertInputToINR(incomeForm.amount)
      };
      await api.post('/income', payload);
      showToast("Income logged successfully", "success");
      setShowIncomeModal(false);
      setIncomeForm({
        amount: '',
        source: 'Salary',
        date: getTodayDateStr(),
        description: '',
        notes: ''
      });
      fetchTransactions();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to log income.", "error");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>{t('transactionsHistory')}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{t('transactionsSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowScannerModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Camera size={16} /> Scan Receipt
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> {t('addExpense')}
          </button>
          <button onClick={() => setShowIncomeModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> {t('addIncome')}
          </button>
        </div>
      </div>

      {/* Search and Filters Header Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Keyword Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '42px' }}
            />
          </div>

          {/* Type Filter */}
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)} 
            className="form-control" 
            style={{ width: '150px' }}
          >
            <option value="">{t('allTypes')}</option>
            <option value="income">{t('incomeOnly')}</option>
            <option value="expense">{t('expenseOnly')}</option>
          </select>

          {/* Category Filter */}
          <select 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)} 
            className="form-control" 
            style={{ width: '180px' }}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{tCategory(c.name)} ({c.type})</option>
            ))}
          </select>
        </div>

        {/* Date Filters & Sorting Toggle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>{t('dateRange')}</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="form-control" 
              style={{ width: '150px', padding: '6px 10px', fontSize: '0.8rem' }} 
            />
            <span style={{ color: 'var(--text-muted)' }}>{t('to')}</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="form-control" 
              style={{ width: '150px', padding: '6px 10px', fontSize: '0.8rem' }} 
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Date
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('sort')}</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="form-control"
              style={{ width: '120px', padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="date">{t('date')}</option>
              <option value="amount">{t('amount')}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Toggle Sort Order"
            >
              <ArrowUpDown size={12} /> {sortOrder === 'asc' ? t('asc') : t('desc')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Transactions Log Card */}
      <div className="card">
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Retrieving transaction records...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>{t('noTransactions')}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('colDate')}</th>
                  <th>{t('colNameSource')}</th>
                  <th>{t('colCategory')}</th>
                  <th>{t('colPaymentMethod')}</th>
                  <th>{t('colAmount')}</th>
                  <th>{t('colType')}</th>
                  <th style={{ textAlign: 'right' }}>{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={`${tx.type}-${tx.id}`}>
                    <td style={{ fontSize: '0.82rem' }}>{tx.date}</td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0 }}>{tx.name}</p>
                        {tx.description && tx.description !== tx.name && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={getCategoryStyle(tx.category_name)}>
                        {tCategory(tx.category_name)}
                      </span>
                    </td>
                    <td>{tx.payment_method || '-'}</td>
                    <td style={{ 
                      fontWeight: 700, 
                      color: tx.type === 'income' ? 'var(--secondary)' : 'var(--text-primary)',
                      fontSize: '0.95rem'
                    }}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {tx.type === 'income' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {tx.type === 'income' ? t('incomeType') : t('expenseType')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(tx)}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            padding: '6px',
                            borderRadius: '8px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id, tx.type)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            padding: '6px',
                            borderRadius: '8px',
                            color: 'var(--danger)',
                            cursor: 'pointer'
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================
          ADD EXPENSE MODAL
      ========================================== */}
      {showExpenseModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Add New Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹)*</label>
                <input type="number" step="0.01" className="form-control" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required min="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Category*</label>
                <select className="form-control" value={expenseForm.category_id} onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })} required>
                  <option value="">Select Category</option>
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Merchant*</label>
                <input type="text" placeholder="e.g. Grocery Store" className="form-control" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date*</label>
                <input type="date" className="form-control" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method*</label>
                <select className="form-control" value={expenseForm.payment_method} onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })} required>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="NetBanking">NetBanking</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Record Expense</button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ADD INCOME MODAL
      ========================================== */}
      {showIncomeModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Log Income Source</h3>
              <button onClick={() => setShowIncomeModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleIncomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹)*</label>
                <input type="number" step="0.01" className="form-control" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} required min="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Source*</label>
                <select className="form-control" value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })} required>
                  <option value="Salary">Salary</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Business">Business</option>
                  <option value="Gift">Gift</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" placeholder="e.g. Monthly salary payout" className="form-control" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Date*</label>
                <input type="date" className="form-control" value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Log Income</button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          EDIT TRANSACTION MODAL
      ========================================== */}
      {showEditModal && editingTx && (
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
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Edit {editingTx.type === 'income' ? 'Income' : 'Expense'}</h3>
              <button onClick={() => { setShowEditModal(false); setEditingTx(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹)*</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={editingTx.amount}
                  onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                  required
                  min="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{editingTx.type === 'income' ? 'Source*' : 'Description/Merchant*'}</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingTx.name}
                  onChange={(e) => setEditingTx({ ...editingTx, name: e.target.value })}
                  required
                />
              </div>

              {editingTx.type === 'expense' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Category*</label>
                    <select
                      className="form-control"
                      value={editingTx.category_id}
                      onChange={(e) => setEditingTx({ ...editingTx, category_id: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.filter(c => c.type === 'expense').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method*</label>
                    <select
                      className="form-control"
                      value={editingTx.payment_method}
                      onChange={(e) => setEditingTx({ ...editingTx, payment_method: e.target.value })}
                      required
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="NetBanking">NetBanking</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Date*</label>
                <input
                  type="date"
                  className="form-control"
                  value={editingTx.date}
                  onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description Notes</label>
                <input
                  type="text"
                  placeholder="Additional context..."
                  className="form-control"
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
};

export default Transactions;
