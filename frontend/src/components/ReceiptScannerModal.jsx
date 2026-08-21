import React, { useState } from 'react';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { Camera, Upload, Sparkles, X, Check, FileText } from 'lucide-react';

const ReceiptScannerModal = ({ isOpen, onClose, onScanComplete }) => {
  const { showToast } = useNotifications();
  const { formatCurrency } = useCurrency();
  const { t, tCategory, language } = useLanguage();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setScannedData(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleScanReceipt = async () => {
    if (!selectedFile) {
      showToast("Please select a receipt image to scan.", "warning");
      return;
    }

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('receipt', selectedFile);
      formData.append('language', language);

      const response = await api.post('/expenses/scan-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success && response.data.scanned_data) {
        setScannedData(response.data.scanned_data);
        showToast("Receipt scanned & parsed successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to scan receipt image.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyData = () => {
    if (!scannedData) return;
    onScanComplete(scannedData);
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(5px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>AI Receipt Scanner</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Upload dropzone */}
        <div style={{
          border: '2px dashed rgba(99, 102, 241, 0.3)',
          borderRadius: '14px',
          padding: '24px',
          textAlign: 'center',
          background: 'rgba(99, 102, 241, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }}>
          {previewUrl ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <img
                src={previewUrl}
                alt="Receipt Preview"
                style={{ maxHeight: '200px', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedFile.name}</span>
            </div>
          ) : (
            <>
              <Upload size={32} style={{ color: 'var(--primary)' }} />
              <div>
                <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 4px', fontSize: '0.95rem' }}>Upload Receipt or Bill Image</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>PNG, JPG, WEBP formats supported</p>
              </div>
            </>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="receipt-file-input"
          />
          <label htmlFor="receipt-file-input" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem', marginTop: '6px' }}>
            {previewUrl ? "Choose Different Image" : "Browse Files"}
          </label>
        </div>

        {/* Action button */}
        {selectedFile && !scannedData && (
          <button
            onClick={handleScanReceipt}
            disabled={isScanning}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Sparkles size={18} />
            {isScanning ? "Scanning with AI..." : "Scan Receipt with AI"}
          </button>
        )}

        {/* Extracted Details Result Card */}
        {scannedData && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--secondary)' }} />
                <h4 style={{ fontSize: '0.95rem', color: '#fff', margin: 0 }}>Extracted Transaction Details</h4>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                Parsed
              </span>
            </div>

            {scannedData.summary && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--secondary)' }}>
                "{scannedData.summary}"
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>AMOUNT</span>
                <strong style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>{formatCurrency(scannedData.amount)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>MERCHANT / STORE</span>
                <strong style={{ color: '#fff' }}>{scannedData.merchant || 'Store'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>CATEGORY</span>
                <strong style={{ color: '#fff' }}>{tCategory(scannedData.category)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>DATE</span>
                <strong style={{ color: '#fff' }}>{scannedData.date}</strong>
              </div>
            </div>

            <button
              onClick={handleApplyData}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px', padding: '10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Check size={16} /> Auto-fill Expense Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScannerModal;
