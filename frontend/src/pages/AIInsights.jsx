import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Sparkles, MessageSquare, Send, HelpCircle, AlertCircle, CheckCircle, X } from 'lucide-react';

import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

const AIInsights = () => {
  const { showToast, fetchNotifications } = useNotifications();
  const { language, t, tCategory } = useLanguage();
  const { formatCurrency, convertInputToINR } = useCurrency();

  // AI Analysis States
  const [analysis, setAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Budget Suggestion States
  const [incomeInput, setIncomeInput] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [isSuggestingLoading, setIsSuggestingLoading] = useState(false);

  // Chatbot States
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: t('aiTelemetry') }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const getAnalysis = async () => {
    setIsAnalysisLoading(true);
    try {
      const response = await api.post('/ai/analyze', { language });
      setAnalysis(response.data);
    } catch (e) {
      console.error(e);
      showToast("Failed to compile AI observations.", "error");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  useEffect(() => {
    getAnalysis();
  }, [language]);

  const handleGenerateBudgetSuggestion = async (e) => {
    e.preventDefault();
    if (!incomeInput) return;
    setIsSuggestingLoading(true);
    try {
      const inrAmt = convertInputToINR(incomeInput);
      const response = await api.post('/ai/budget-recommendation', { income: inrAmt, language });
      setSuggestion(response.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to generate budget breakdown.", "error");
    } finally {
      setIsSuggestingLoading(false);
    }
  };

  const applyBudgetSuggestion = async () => {
    if (!suggestion || !suggestion.recommendation) return;
    try {
      const catRes = await api.get('/categories');
      const systemCats = catRes.data.categories.filter(c => c.type === 'expense') || [];

      const categoryBudgetsMapped = {};
      Object.entries(suggestion.recommendation).forEach(([catName, amount]) => {
        const matchingCat = systemCats.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (matchingCat) {
          categoryBudgetsMapped[matchingCat.id] = amount;
        }
      });

      const now = new Date();
      await api.post('/budgets', {
        amount: parseFloat(suggestion.total_income),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        categories_budget: categoryBudgetsMapped
      });

      showToast("AI suggested budget applied successfully!", "success");
      setSuggestion(null);
      setIncomeInput('');
      fetchNotifications();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to apply AI budget parameters.", "error");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: userMessage, language });
      setMessages(prev => [...prev, { sender: 'assistant', text: response.data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Dynamic spending audit and anomalies card */}
      <div className="card" style={{
        background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08) 0%, rgba(30, 37, 54, 0.45) 80%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>{t('aiTelemetry')}</h3>
          </div>
          <button
            onClick={getAnalysis}
            disabled={isAnalysisLoading}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {isAnalysisLoading ? "..." : "Re-evaluate Finances"}
          </button>
        </div>

        {isAnalysisLoading ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Compiling monthly records...</p>
        ) : analysis ? (
          <div className="grid-3" style={{ gap: '24px' }}>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: '10px' }}>Insights</p>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                {analysis.insights.map((ins, i) => <li key={i}>{ins}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: '10px' }}>Recommendations</p>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                {analysis.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: '10px' }}>Suggestions</p>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                {analysis.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>Click Re-evaluate to query database trends.</p>
        )}
      </div>

      {/* Grid: Budget Suggestion & Chatbot */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>

        {/* Left: Income-based budget splits suggerster */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '6px' }}>AI Budget Breakdown Suggestion</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Get category allocations based on the 50/30/20 standard.</p>
          </div>

          <form onSubmit={handleGenerateBudgetSuggestion} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              placeholder="Enter Monthly Income..."
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              className="form-control"
              required
              min="1"
            />
            <button type="submit" disabled={isSuggestingLoading} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
              {isSuggestingLoading ? "..." : "Suggest"}
            </button>
          </form>

          {suggestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.82rem', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                {suggestion.explanation}
              </div>

              {/* Recommendations category bar items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {Object.entries(suggestion.recommendation).map(([catName, amt]) => (
                  <div key={catName} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{tCategory(catName)}</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setSuggestion(null)} className="btn btn-secondary" style={{ flex: 1, padding: '8px' }}><X size={14} /> {t('cancel')}</button>
                <button onClick={applyBudgetSuggestion} className="btn btn-primary" style={{ flex: 1, padding: '8px' }}><CheckCircle size={14} /> {t('confirm')}</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Messenger Chat Interface */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '450px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: 0 }}>AI Financial Chatbot</h3>
          </div>

          {/* Chat Messages Feed */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '10px 4px',
            marginBottom: '14px'
          }} className="chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  borderTopRightRadius: msg.sender === 'user' ? '2px' : '12px',
                  borderTopLeftRadius: msg.sender === 'assistant' ? '2px' : '12px',
                  background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${msg.sender === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.06)'}`,
                  color: msg.sender === 'user' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  lineHeight: 1.4
                }}
              >
                {msg.text}
              </div>
            ))}
            {isChatLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                ...
              </div>
            )}
          </div>

          {/* Prompt input field */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="form-control"
              disabled={isChatLoading}
            />
            <button type="submit" disabled={isChatLoading} className="btn btn-primary" style={{ padding: '10px 14px' }}>
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};

export default AIInsights;
