import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Users,
  Plus,
  Sparkles,
  ArrowRight,
  PlusCircle,
  X,
  Camera
} from 'lucide-react';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6', '#ef4444'];

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

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { formatCurrency, convertInputToINR } = useCurrency();
  const { t, tCategory, language } = useLanguage();
  const navigate = useNavigate();

  // Dashboard Stats States
  const [stats, setStats] = useState({
    total_balance: 0,
    monthly_income: 0,
    monthly_spent: 0,
    active_groups: 0,
    savings_rate: 0
  });

  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [categories, setCategories] = useState([]);

  // AI & Loader States
  const [aiSummary, setAiSummary] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal Toggles
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
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

  // Form Field States
  const [expenseForm, setExpenseForm] = useState({ amount: '', category_id: '', description: '', date: new Date().toISOString().split('T')[0], payment_method: 'UPI' });
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: 'Salary', description: '', date: new Date().toISOString().split('T')[0] });
  const [budgetForm, setBudgetForm] = useState({ amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const summaryRes = await api.get('/reports/summary');
      const data = summaryRes.data || {};
      setStats({
        total_balance: data.total_balance || 0,
        month_income: data.month_income ?? data.monthly_income ?? 0,
        month_expenses: data.month_expenses ?? data.monthly_spent ?? 0,
        monthly_income: data.monthly_income ?? data.month_income ?? 0,
        monthly_spent: data.monthly_spent ?? data.month_expenses ?? 0,
        current_monthly_budget: data.current_monthly_budget || 0,
        remaining_monthly_budget: data.remaining_monthly_budget || 0,
        active_groups: data.active_groups || 0,
        savings_rate: data.savings_rate || 0
      });

      const trendRes = await api.get('/reports/monthly');
      setMonthlyTrends(trendRes.data.trends || []);

      const catRes = await api.get('/reports/category');
      setCategoryDistribution(catRes.data.distribution || []);

      const txRes = await api.get('/expenses/unified');
      const allTx = txRes.data.transactions || [];
      setRecentTransactions(allTx.slice(0, 5));

      const budgetRes = await api.get('/budgets');
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const activeBudget = (budgetRes.data.budgets || []).find(
        b => b.month === currentMonth && b.year === currentYear
      );
      setMonthlyBudget(activeBudget || null);

      const allCatsRes = await api.get('/categories');
      setCategories(allCatsRes.data.categories || []);

    } catch (error) {
      console.error("Dashboard data load failure:", error);
      showToast("Failed to retrieve dashboard analytics.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getAiAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const response = await api.post('/ai/analyze', { language });
      setAiSummary(response.data);
    } catch (err) {
      console.error("AI service failure:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    getAiAnalysis();
  }, [language]);

  // Form Submit Handlers
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
      // Reset form
      setExpenseForm({ amount: '', category_id: '', date: getTodayDateStr(), payment_method: 'UPI', description: '', notes: '' });
      loadDashboardData();
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
      setIncomeForm({ amount: '', source: 'Salary', date: getTodayDateStr(), description: '', notes: '' });
      loadDashboardData();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to log income.", "error");
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!budgetForm.amount || !budgetForm.month || !budgetForm.year) {
      showToast("Please fill all required budget fields.", "warning");
      return;
    }
    try {
      const payload = {
        ...budgetForm,
        amount: convertInputToINR(budgetForm.amount)
      };
      await api.post('/budgets', payload);
      showToast("Monthly budget established", "success");
      setShowBudgetModal(false);
      loadDashboardData();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to set budget.", "error");
    }
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupForm.name) {
      showToast("Group name is required.", "warning");
      return;
    }
    try {
      const response = await api.post('/groups', groupForm);
      showToast("Group created successfully", "success");
      setShowGroupModal(false);
      setGroupForm({ name: '', description: '' });
      loadDashboardData();
      navigate(`/groups/${response.data.group.id}`);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to create group.", "error");
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '80vh',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)'
      }}>
        Loading Dashboard Panel...
      </div>
    );
  }

  // Budget Progress Calculations
  const budgetVal = stats.current_monthly_budget;
  const spentVal = stats.month_expenses;
  const budgetPercent = budgetVal > 0 ? Math.min((spentVal / budgetVal) * 100, 100) : 0;

  let budgetColor = 'var(--secondary)';
  if (budgetPercent >= 100) budgetColor = 'var(--danger)';
  else if (budgetPercent >= 70) budgetColor = 'var(--accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Metric Cards Grid */}
      <div className="grid-4" style={{ gap: '20px' }}>

        {/* Card 1: Balance */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wallet size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{t('totalBalance')}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {formatCurrency(stats.total_balance)}
            </h3>
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{t('monthlyIncome')}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {formatCurrency(stats.month_income)}
            </h3>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{t('monthlySpent')}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {formatCurrency(stats.month_expenses)}
            </h3>
          </div>
        </div>

        {/* Card 4: Groups */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{t('activeGroups')}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {stats.active_groups}
            </h3>
          </div>
        </div>

      </div>

      {/* Main Grid: Charts & Budget */}
      <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

        {/* Left: Monthly Trend BarChart */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: '#fff' }}>Monthly Cash Flow</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={(monthlyTrends || []).filter(item => item.income > 0 || item.expense > 0)}>
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1e2536', border: '1px solid rgba(255,255,255,0.08)' }} />
                <Legend />
                <Bar dataKey="income" fill="var(--secondary)" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--primary)" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Budget utilization circular/progress representation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', color: '#fff' }}>{t('monthlyBudget')}</h3>
            {budgetVal > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('utilization')} ({budgetPercent.toFixed(1)}%)</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(spentVal)} / {formatCurrency(budgetVal)}</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${budgetPercent}%`, height: '100%', background: budgetColor, borderRadius: '5px', transition: 'width 0.5s' }} />
                  </div>
                </div>

                <p style={{
                  fontSize: '0.82rem',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: budgetPercent >= 100 ? 'rgba(239,68,68,0.1)' : budgetPercent >= 70 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  color: budgetPercent >= 100 ? 'var(--danger)' : budgetPercent >= 70 ? 'var(--accent)' : 'var(--secondary)',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  {budgetPercent >= 100
                    ? t('exceededStatus')
                    : budgetPercent >= 70
                      ? t('warningStatus')
                      : t('safeStatus')}
                </p>
                <div style={{ fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('remaining')}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{formatCurrency(stats.remaining_monthly_budget)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>No monthly budget created.</p>
                <button onClick={() => setShowBudgetModal(true)} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Set Budget Threshold
                </button>
              </div>
            )}
          </div>

          {/* Quick actions row inside budget card */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' }}>
            <button onClick={() => setShowScannerModal(true)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Camera size={14} /> Scan Receipt
            </button>
            <button onClick={() => setShowExpenseModal(true)} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Plus size={14} /> Add Expense
            </button>
            <button onClick={() => setShowIncomeModal(true)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Plus size={14} /> Add Income
            </button>
          </div>
        </div>

      </div>

      {/* Grid: Pie Chart (Category Distribution) & Recent Transactions */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 2fr', gap: '24px' }}>

        {/* Left: Category Distribution Pie Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#fff' }}>Expenses by Category</h3>
          <div style={{ width: '100%', height: '220px', flex: 1 }}>
            {categoryDistribution.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    dataKey="total_amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No expenses logged this month
              </div>
            )}
          </div>
          {categoryDistribution.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.72rem', marginTop: '10px' }}>
              {categoryDistribution.slice(0, 4).map((item, idx) => (
                <div key={item.category_name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.category_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Transactions Table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Recent Transactions</h3>
            <button onClick={() => navigate('/transactions')} style={{ fontSize: '0.8rem', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div className="table-container" style={{ flex: 1 }}>
            {recentTransactions.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={`${tx.type}-${tx.id}`}>
                      <td style={{ fontSize: '0.82rem' }}>{tx.date}</td>
                      <td style={{ fontWeight: 600 }}>{tx.name}</td>
                      <td>
                        <span style={getCategoryStyle(tx.category_name)}>
                          {tCategory(tx.category_name)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: tx.type === 'income' ? 'var(--secondary)' : 'var(--text-primary)' }}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td>
                        <span className={`badge badge-${tx.type}`}>
                          {tx.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No recent transactions found. Click "Add Expense" to get started.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom: AI Insights Quick Panel Card */}
      <div className="card" style={{
        background: 'radial-gradient(circle at top left, rgba(99, 102, 241, 0.08) 0%, rgba(30, 37, 54, 0.45) 80%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Spendora AI Finance Advisor</h3>
          </div>
          <button
            onClick={getAiAnalysis}
            disabled={isAiLoading}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {isAiLoading ? "Analyzing..." : "Refresh Insights"}
          </button>
        </div>

        {aiSummary ? (
          <div className="grid-3" style={{ gap: '20px', fontSize: '0.88rem' }}>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Spending Insights</p>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(aiSummary?.insights || []).slice(0, 2).map((ins, i) => <li key={i}>{ins}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Recommendations</p>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(aiSummary?.recommendations || []).slice(0, 2).map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Saving Suggestions</p>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(aiSummary?.suggestions || []).slice(0, 2).map((sug, i) => <li key={i}>{sug}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Click "Refresh Insights" to let Spendora AI evaluate your transaction history, check budgets, identify anomalously high spending, and compile custom suggestions.
          </p>
        )}
      </div>

      {/* ==========================================
          MODALS SECTION (CRUD TRIGGERS)
      ========================================== */}

      {/* 1. Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'zoomIn 0.2s' }}>
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

      {/* 2. Add Income Modal */}
      {showIncomeModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'zoomIn 0.2s' }}>
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

      {/* 3. Create Budget Modal */}
      {showBudgetModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'zoomIn 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Establish Monthly Budget</h3>
              <button onClick={() => setShowBudgetModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleBudgetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Limit Amount (₹)*</label>
                <input type="number" className="form-control" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Month*</label>
                <select className="form-control" value={budgetForm.month} onChange={(e) => setBudgetForm({ ...budgetForm, month: e.target.value })} required>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year*</label>
                <input type="number" className="form-control" value={budgetForm.year} onChange={(e) => setBudgetForm({ ...budgetForm, year: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Set Budget</button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create Group Modal */}
      {showGroupModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'zoomIn 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Create Expense Group</h3>
              <button onClick={() => setShowGroupModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Group Name*</label>
                <input type="text" placeholder="e.g. Friends Goa Trip" className="form-control" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows="3" placeholder="Describe the group purpose..." className="form-control" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Create Group</button>
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

      {/* Quick style override for scroll animations */}
      <style>{`
        .modal-backdrop {
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
