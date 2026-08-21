import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Mail, 
  PlusCircle, 
  DollarSign, 
  Check, 
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

const GroupDetails = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { formatCurrency, convertInputToINR } = useCurrency();
  const { t, tCategory } = useLanguage();

  // Data States
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Control States
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showManualSettlementModal, setShowManualSettlementModal] = useState(false);

  // Form Fields
  const [memberEmail, setMemberEmail] = useState('');
  
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paid_by_id: user?.id || '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    split_method: 'equal'
  });
  
  // Splits input values for custom/percentage split: {user_id: value}
  const [customSplits, setCustomSplits] = useState({});
  const [percentSplits, setPercentSplits] = useState({});

  // Manual Settlement Fields
  const [manualFrom, setManualFrom] = useState('');
  const [manualTo, setManualTo] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  const loadGroupDetails = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/groups/${groupId}`);
      const { group: groupInfo, members: m, expenses: e, settlements: s } = response.data;
      setGroup(groupInfo);
      setMembers(m);
      setExpenses(e);
      setSettlements(s);

      // Fetch categories for expenses dropdown
      const catResponse = await api.get('/categories');
      setCategories(catResponse.data.categories.filter(c => c.type === 'expense') || []);

      // Default paid_by_id in form if not set
      if (!expenseForm.paid_by_id && m.length > 0) {
        setExpenseForm(prev => ({ ...prev, paid_by_id: user?.id || m[0].id }));
      }
    } catch (error) {
      console.error("Failed to load group detail panel:", error);
      showToast("Group details not found or unauthorized.", "error");
      navigate('/groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  // Set default split lists whenever members change
  useEffect(() => {
    const initialCustoms = {};
    const initialPercents = {};
    members.forEach(m => {
      initialCustoms[m.id] = '';
      initialPercents[m.id] = (100.0 / members.length).toFixed(1);
    });
    setCustomSplits(initialCustoms);
    setPercentSplits(initialPercents);
  }, [members]);

  // Form Submits
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      showToast("Email address is required.", "warning");
      return;
    }
    try {
      await api.post(`/groups/${groupId}/members`, { email: memberEmail });
      showToast("Member invited successfully.", "success");
      setShowMemberModal(false);
      setMemberEmail('');
      loadGroupDetails();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to invite user.", "error");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const { description, amount, paid_by_id, category_id, date, split_method } = expenseForm;
    
    if (!description || !amount || !paid_by_id || !category_id || !date) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    const amountVal = parseFloat(amount);
    const splitData = [];

    if (split_method === 'equal') {
      // Split equally among all current members
      members.forEach(m => {
        splitData.push({ user_id: m.id });
      });
    } else if (split_method === 'custom') {
      let customSum = 0;
      for (const m of members) {
        const amt = parseFloat(customSplits[m.id] || 0);
        if (amt < 0) {
          showToast("Split amounts cannot be negative.", "warning");
          return;
        }
        customSum += amt;
        splitData.push({ user_id: m.id, amount: amt });
      }
      if (Math.abs(customSum - amountVal) > 0.05) {
        showToast(`Sum of splits (₹${customSum.toFixed(2)}) must equal total amount (₹${amountVal.toFixed(2)}).`, "error");
        return;
      }
    } else if (split_method === 'percentage') {
      let percentSum = 0;
      for (const m of members) {
        const pct = parseFloat(percentSplits[m.id] || 0);
        if (pct < 0) {
          showToast("Percentages cannot be negative.", "warning");
          return;
        }
        percentSum += pct;
        splitData.push({ user_id: m.id, percentage: pct });
      }
      if (Math.abs(percentSum - 100.0) > 0.05) {
        showToast(`Sum of percentages (${percentSum.toFixed(1)}%) must equal exactly 100%.`, "error");
        return;
      }
    }

    try {
      await api.post(`/groups/${groupId}/expenses`, {
        description,
        amount: amountVal,
        paid_by_id: parseInt(paid_by_id),
        category_id: parseInt(category_id),
        date,
        split_method,
        splits: splitData
      });

      showToast("Group expense logged and splits computed.", "success");
      setShowExpenseModal(false);
      // Reset form
      setExpenseForm({
        description: '',
        amount: '',
        paid_by_id: user?.id || members[0]?.id || '',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        split_method: 'equal'
      });
      loadGroupDetails();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to record group expense.", "error");
    }
  };

  const handleManualSettlement = async (e) => {
    e.preventDefault();
    if (!manualFrom || !manualTo || !manualAmount) {
      showToast("Please fill in all manual settlement fields.", "warning");
      return;
    }
    try {
      await api.post(`/groups/${groupId}/settlements`, {
        from_user_id: parseInt(manualFrom),
        to_user_id: parseInt(manualTo),
        amount: parseFloat(manualAmount)
      });
      showToast("Settlement recorded successfully", "success");
      confetti(); // Celebration confetti
      setShowManualSettlementModal(false);
      setManualFrom('');
      setManualTo('');
      setManualAmount('');
      loadGroupDetails();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to record manual settlement.", "error");
    }
  };

  const handleMarkSettled = async (settlementId) => {
    try {
      await api.put(`/groups/settlements/${settlementId}`);
      showToast("Settlement marked completed.", "success");
      confetti({ particleCount: 150, spread: 80 }); // Confetti trigger
      loadGroupDetails();
    } catch (error) {
      showToast("Failed to mark settlement settled.", "error");
    }
  };

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm("Are you sure you want to delete this group expense? All splits will be reverted.")) return;
    try {
      await api.delete(`/groups/${groupId}/expenses/${expId}`);
      showToast("Expense removed and debts recalculated.", "success");
      loadGroupDetails();
    } catch (error) {
      showToast("Failed to delete expense.", "error");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Retrieving group specifics...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Back to list and header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/groups" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Shared Groups
        </Link>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created by {group.creator_name}</h4>
      </div>

      {/* Hero Info Banner */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>{group.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>{group.description || "No description provided."}</p>
      </div>

      {/* Layout Split: Left Main Ledger / Right Settlement and Members */}
      <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left column: Expenses Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Expenses Log</h3>
              <button onClick={() => setShowExpenseModal(true)} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                <Plus size={14} /> Log Group Expense
              </button>
            </div>

            <div className="table-container">
              {expenses.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  No group expenses recorded yet. Tap "Log Group Expense" to add your first bill.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Paid By</th>
                      <th>Category</th>
                      <th>Total Amount</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td style={{ fontSize: '0.82rem' }}>{exp.date}</td>
                        <td>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>{exp.description}</p>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Method: {exp.split_method} split</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{exp.paid_by_name}</td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            background: 'rgba(255,255,255,0.04)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>{tCategory(exp.category_name)}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                          {formatCurrency(exp.amount)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.15)',
                              padding: '6px',
                              borderRadius: '8px',
                              color: 'var(--danger)',
                              cursor: 'pointer'
                            }}
                            title="Delete Expense"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right column: Settlement balances & member invite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Debt settlement pairings */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#fff' }}>Settlement Matrix</h3>
              <button 
                onClick={() => setShowManualSettlementModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Record Payment
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {settlements.filter(s => s.status === 'pending').length === 0 ? (
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: 'var(--secondary)',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  🎉 All balances settled! No pending debts.
                </div>
              ) : (
                settlements.filter(s => s.status === 'pending').map((s) => (
                  <div 
                    key={s.id} 
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>
                        {s.from_user_name}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>owes {s.to_user_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>
                        {formatCurrency(s.amount)}
                      </span>
                      <button
                        onClick={() => handleMarkSettled(s.id)}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          color: 'var(--secondary)'
                        }}
                        title="Mark Completed"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Show completed list */}
            {settlements.filter(s => s.status === 'completed').length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Past Settlements</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                  {settlements.filter(s => s.status === 'completed').slice(0, 5).map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>{s.from_user_name} paid {s.to_user_name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{formatCurrency(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Members list & add members panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} /> Group Members
              </h3>
              <button 
                onClick={() => setShowMemberModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <PlusCircle size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m) => (
                <div 
                  key={m.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{m.full_name}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.email}</span>
                  </div>
                  {m.id === group.creator_id && (
                    <span style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Creator</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ==========================================
          MODALS
      ========================================== */}

      {/* 1. Add Member Modal */}
      {showMemberModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Add Member to Group</h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">User Email Address*</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    placeholder="friend@spendora.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '42px' }}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}><UserCheck size={16} /> Add Member</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Log Group Expense Modal */}
      {showExpenseModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Log Group Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Description / Invoice Item*</label>
                <input 
                  type="text" 
                  placeholder="e.g. Dinner reservation deposit" 
                  className="form-control" 
                  value={expenseForm.description} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} 
                  required 
                />
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Total Amount (₹)*</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    value={expenseForm.amount} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} 
                    required 
                    min="0.01" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category*</label>
                  <select 
                    className="form-control" 
                    value={expenseForm.category_id} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })} 
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Paid By*</label>
                  <select 
                    className="form-control" 
                    value={expenseForm.paid_by_id} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, paid_by_id: e.target.value })} 
                    required
                  >
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date*</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={expenseForm.date} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              {/* Splitting Method selectors */}
              <div className="form-group">
                <label className="form-label">Split Method</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['equal', 'custom', 'percentage'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setExpenseForm({ ...expenseForm, split_method: method })}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '0.8rem',
                        background: expenseForm.split_method === method ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${expenseForm.split_method === method ? 'var(--primary)' : 'rgba(255,255,255,0.06)'}`,
                        color: expenseForm.split_method === method ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic split input fields based on method */}
              {expenseForm.split_method === 'custom' && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Enter Custom Splits Amount (₹):</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{m.full_name}</span>
                        <input
                          type="number"
                          placeholder="Amount (₹)"
                          value={customSplits[m.id] || ''}
                          onChange={(e) => setCustomSplits({ ...customSplits, [m.id]: e.target.value })}
                          className="form-control"
                          style={{ width: '130px', padding: '6px 10px', fontSize: '0.8rem' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expenseForm.split_method === 'percentage' && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Enter Split Percentages (%):</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{m.full_name}</span>
                        <input
                          type="number"
                          placeholder="Percent (%)"
                          value={percentSplits[m.id] || ''}
                          onChange={(e) => setPercentSplits({ ...percentSplits, [m.id]: e.target.value })}
                          className="form-control"
                          style={{ width: '130px', padding: '6px 10px', fontSize: '0.8rem' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Log expense</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Record Offline Manual Settlement Modal */}
      {showManualSettlementModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Record Manual Settlement</h3>
              <button onClick={() => setShowManualSettlementModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleManualSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Who paid? (From)*</label>
                <select className="form-control" value={manualFrom} onChange={(e) => setManualFrom(e.target.value)} required>
                  <option value="">Select Debtor</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Who was paid? (To)*</label>
                <select className="form-control" value={manualTo} onChange={(e) => setManualTo(e.target.value)} required>
                  <option value="">Select Creditor</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (₹)*</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    style={{ paddingLeft: '42px' }}
                    required
                    min="0.01"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}><CreditCard size={16} /> Record Payment</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GroupDetails;
