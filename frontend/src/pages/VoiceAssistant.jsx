import React from 'react';
import VoiceAssistantWidget from '../components/VoiceAssistantWidget';
import { Mic } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const VoiceAssistant = () => {
  const { t, language } = useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Introduction banner */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic size={20} style={{ color: 'var(--primary)' }} /> {t('voiceCommandCenter')}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
          Manage your budgets and expenses using your voice. Press the microphone below and speak.
        </p>
      </div>

      {/* Embed Assistant Widget */}
      <VoiceAssistantWidget embedded={true} />

      {/* Detailed Commands Cheatsheet */}
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px' }}>
          {language === 'ta' ? 'குரல் கட்டளைகள் வழிகாட்டி' : 'Available Commands Guide'}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--secondary)', borderRadius: '4px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
              {language === 'ta' ? 'பதிவு' : 'Log'}
            </span>
            <div>
              <p style={{ fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>
                {language === 'ta' ? '"உணவுக்கு 250 ரூபாய் சேர்"' : '"Add [amount] rupees for [category]"'}
              </p>
              <span style={{ color: 'var(--text-secondary)' }}>
                {language === 'ta' 
                  ? 'எடுத்துக்காட்டு: "உணவுக்கு 250 சேர்", "பயணத்திற்கு 500 ரூபாய்", "250 rupees for food".' 
                  : 'Examples: "Add 250 rupees for food", "Add 1200 for rent", "Record 500 for transport".'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
            <span style={{ padding: '2px 6px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--info)', borderRadius: '4px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
              {language === 'ta' ? 'கேள்வி' : 'Query'}
            </span>
            <div>
              <p style={{ fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>
                {language === 'ta' ? '"இந்த மாத செலவு எவ்வளவு?"' : '"How much did I spend this month?"'}
              </p>
              <span style={{ color: 'var(--text-secondary)' }}>
                {language === 'ta' 
                  ? 'செலவைக் கணக்கிட்டு உரக்கக் கூறும். அல்லது "பட்ஜெட் மீதி எவ்வளவு?" என்று கேட்கலாம்.' 
                  : 'Calculates expenses and speaks results out loud. Or query: "What is my remaining budget?"'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
            <span style={{ padding: '2px 6px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', borderRadius: '4px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
              {language === 'ta' ? 'பிரிவு' : 'Category'}
            </span>
            <div>
              <p style={{ fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>
                {language === 'ta' ? '"உணவு செலவு எவ்வளவு?"' : '"How much did I spend on food?"'}
              </p>
              <span style={{ color: 'var(--text-secondary)' }}>
                {language === 'ta' 
                  ? 'குறிப்பிட்ட பிரிவின் செலவைக் கேட்கலாம் (உணவு, பயணம், பில், ஷாப்பிங் போன்றவை).' 
                  : 'Queries expenses belonging to standard categories. Synonyms like dinner or groceries map automatically.'}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default VoiceAssistant;
