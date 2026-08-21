import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Filter, BarChart3, PieChart as PieIcon, Download, FileText, Loader2 } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6', '#ef4444'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Reports = () => {
  const { showToast } = useNotifications();
  const { formatCurrency } = useCurrency();
  const { t, tCategory } = useLanguage();

  // Filter States for charts
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // PDF Export States
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch monthly trend
      const trendRes = await api.get('/reports/monthly');
      setTrends(trendRes.data.trends || []);

      // 2. Fetch category distribution
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const distRes = await api.get('/reports/category', { params });
      setDistribution(distRes.data.distribution || []);
    } catch (e) {
      console.error(e);
      showToast("Failed to compile financial charts.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [startDate, endDate]);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const response = await api.get('/reports/export-pdf', {
        params: { month: selectedMonth, year: selectedYear },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const formattedMonth = String(selectedMonth).padStart(2, '0');
      link.setAttribute('download', `Spendora_Monthly_Report_${selectedYear}_${formattedMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Downloaded ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} PDF Report successfully!`, "success");
    } catch (err) {
      console.error("PDF export error:", err);
      showToast("Failed to generate PDF report. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const yearsOptions = [];
  const startY = currentDate.getFullYear();
  for (let y = startY; y >= startY - 5; y--) {
    yearsOptions.push(y);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* PDF Export Banner Card */}
      <div 
        className="card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '20px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}>
            <FileText size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: 0, fontWeight: 600 }}>
              {t('exportPdfReport')}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              {t('exportPdfSubtitle')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Month Dropdown */}
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="form-control"
            style={{ width: '130px', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="form-control"
            style={{ width: '100px', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {yearsOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Download Button */}
          <button 
            onClick={handleDownloadPdf} 
            disabled={isExporting}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '9px 18px', 
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>{t('generatingPdf')}</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>{t('downloadPdf')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters Header Panel */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <h3 style={{ fontSize: '1.05rem', color: '#fff', margin: 0 }}>{t('reportsAnalytics')}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
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
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Compiling chart metrics...
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '24px' }}>
          
          {/* Bar Chart monthly comparison */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--primary)' }} /> {t('monthlyCashFlow')}
            </h3>
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer>
                <BarChart data={trends}>
                  <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: '#1e2536', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <Legend />
                  <Bar dataKey="income" fill="var(--secondary)" name={t('incomeOnly')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--primary)" name={t('expenseOnly')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart Expense Distribution */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieIcon size={18} style={{ color: 'var(--secondary)' }} /> {t('expensesByCategory')}
              </h3>
              <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {distribution.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="total_amount"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No expenses found for this date range.</p>
                )}
              </div>

              {/* Legends Table */}
              {distribution.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {distribution.map((item, idx) => (
                    <div key={item.category_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{tCategory(item.category_name)}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(item.total_amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;

