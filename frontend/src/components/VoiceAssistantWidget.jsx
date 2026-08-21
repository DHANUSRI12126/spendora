import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Mic, MicOff, Send, X, AlertTriangle, Check } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

const VoiceAssistantWidget = ({ embedded = false }) => {
  const { showToast, fetchNotifications } = useNotifications();
  const { currentLanguage } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [fallbackText, setFallbackText] = useState('');
  const [responseMsg, setResponseMsg] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingExpense, setPendingExpense] = useState(null);

  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = currentLanguage?.speechLang || 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setTranscript('Listening...');
      setResponseMsg('');
    };

    rec.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setTranscript('No speech detected. Try again.');
      } else {
        setTranscript(`Error: ${event.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
      processCommand(resultText);
    };

    recognitionRef.current = rec;
  }, []);

  // Text-to-Speech Helper with multi-language voice selection
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const speechLang = currentLanguage?.speechLang || 'en-US';
        utterance.lang = speechLang;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const langPrefix = speechLang.split('-')[0]; // e.g. 'ta', 'te', 'hi', 'en'
          const preferredVoice = voices.find(v => v.lang.startsWith(langPrefix)) || 
                                 voices.find(v => v.lang.startsWith('en')) || 
                                 voices[0];
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }

        utterance.onerror = (e) => {
          console.warn("Text-to-speech notice:", e.error);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis error:", err);
      }
    }
  };

  const toggleListening = () => {
    if (!speechSupported) {
      showToast("Speech Recognition is not supported by your browser. Use text input fallback.", "warning");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setResponseMsg('');
      recognitionRef.current.start();
    }
  };

  const processCommand = async (commandText) => {
    if (!commandText.trim()) return;
    try {
      const response = await api.post('/voice/command', { 
        text: commandText,
        language: currentLanguage.code 
      });
      const { intent, entities, message } = response.data;
      
      setResponseMsg(message);
      speakText(message);

      if (intent === 'ADD_EXPENSE' && entities && entities.amount > 0) {
        setPendingExpense(entities);
        setShowConfirmModal(true);
      } else if (intent === 'QUERY_FINANCES') {
        // Command was resolved directly by chatbot
        // Refresh notifications in case budget was queried
        fetchNotifications();
      }
    } catch (error) {
      console.error("Voice processing error:", error);
      const errMsg = "Sorry, I couldn't process that command.";
      setResponseMsg(errMsg);
      speakText(errMsg);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!fallbackText.trim()) return;
    setTranscript(fallbackText);
    processCommand(fallbackText);
    setFallbackText('');
  };

  const confirmExpense = async () => {
    if (!pendingExpense) return;
    try {
      await api.post('/expenses', {
        amount: pendingExpense.amount,
        category_id: pendingExpense.category_id,
        date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI', // default UPI for voice
        description: pendingExpense.description,
        notes: 'Logged via Spendora Voice Assistant'
      });
      showToast(`Added ₹${pendingExpense.amount} to ${pendingExpense.category}`, "success");
      speakText("Expense added successfully.");
      
      // Reset
      setShowConfirmModal(false);
      setPendingExpense(null);
      fetchNotifications(); // refresh budget thresholds alerts
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to log expense.", "error");
    }
  };

  return (
    <div className="voice-assistant-card card" style={{
      padding: '30px',
      background: 'rgba(30, 37, 54, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
      maxWidth: '500px',
      margin: '0 auto',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
    }}>
      
      {/* Microphone button indicator */}
      <div style={{ position: 'relative' }}>
        {isListening && (
          <div style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            border: '2px solid var(--primary)',
            animation: 'pulse 1.5s infinite',
            pointerEvents: 'none'
          }} />
        )}
        <button
          onClick={toggleListening}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isListening 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: isListening 
              ? '0 0 25px rgba(239, 68, 68, 0.5)'
              : '0 0 25px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isListening ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </div>

      {/* Helper text instructions */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
          {isListening ? "Listening..." : "Tap mic to talk"}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto' }}>
          Try commands like: <br />
          <b>"Add 250 rupees for food"</b> or <br />
          <b>"How much did I spend this month?"</b>
        </p>
      </div>

      {/* Transcript displaying */}
      {transcript && (
        <div style={{
          width: '100%',
          padding: '14px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.9rem',
          color: '#fff',
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          "{transcript}"
        </div>
      )}

      {/* Response displaying */}
      {responseMsg && (
        <div style={{
          width: '100%',
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '0.92rem',
          color: '#e0e7ff',
          lineHeight: 1.4,
          textAlign: 'center'
        }}>
          <b>Spendora Assistant:</b> {responseMsg}
        </div>
      )}

      {/* Fallback Text Input (if browser doesn't support Web Speech) */}
      {!speechSupported && (
        <div style={{
          width: '100%',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '10px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: 'var(--accent)'
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Speech Recognition is unsupported on this browser. You can type commands below.</span>
        </div>
      )}

      {/* Text fallback command submission form */}
      <form onSubmit={handleTextSubmit} style={{
        display: 'flex',
        width: '100%',
        gap: '8px'
      }}>
        <input
          type="text"
          placeholder="Type voice command..."
          value={fallbackText}
          onChange={(e) => setFallbackText(e.target.value)}
          className="form-control"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px' }}>
          <Send size={16} />
        </button>
      </form>

      {/* Speech Confirmation Modal Overlay */}
      {showConfirmModal && pendingExpense && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{
            maxWidth: '400px',
            width: '100%',
            background: 'rgba(30, 37, 54, 0.95)',
            border: '1px solid var(--primary)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'zoomIn 0.2s ease-out'
          }}>
            <h3 style={{ fontSize: '1.3rem', color: '#fff' }}>Confirm Expense</h3>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount</p>
              <h2 style={{ fontSize: '2rem', color: 'var(--secondary)', fontWeight: 800 }}>
                ₹{pendingExpense.amount.toFixed(2)}
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{pendingExpense.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Description:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{pendingExpense.description}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingExpense(null); }}
                className="btn btn-secondary" 
                style={{ flex: 1 }}
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={confirmExpense}
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                <Check size={16} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pulse Animation rules */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.3; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistantWidget;
