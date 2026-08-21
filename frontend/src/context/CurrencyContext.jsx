import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', rate: 1.0, label: 'INR (₹)', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', rate: 0.012, label: 'USD ($)', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', rate: 0.011, label: 'EUR (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', rate: 0.0094, label: 'GBP (£)', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', rate: 1.80, label: 'JPY (¥)', locale: 'ja-JP' },
  AED: { code: 'AED', symbol: 'د.إ', rate: 0.044, label: 'AED (د.إ)', locale: 'ar-AE' },
  CAD: { code: 'CAD', symbol: 'CA$', rate: 0.016, label: 'CAD (CA$)', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', rate: 0.018, label: 'AUD (A$)', locale: 'en-AU' }
};

export const CurrencyProvider = ({ children }) => {
  const [currencyCode, setCurrencyCode] = useState(() => {
    return localStorage.getItem('spendora_currency') || 'INR';
  });

  useEffect(() => {
    localStorage.setItem('spendora_currency', currencyCode);
  }, [currencyCode]);

  const currentCurrency = CURRENCIES[currencyCode] || CURRENCIES.INR;

  const changeCurrency = (code) => {
    if (CURRENCIES[code]) {
      setCurrencyCode(code);
    }
  };

  /**
   * Formats base INR amount into active selected currency with appropriate symbol and decimals.
   */
  const formatCurrency = (amountInINR, decimals = 2) => {
    const numericAmt = parseFloat(amountInINR || 0);
    const converted = numericAmt * currentCurrency.rate;
    
    // For JPY, default to 0 decimals unless specified
    const minDecimals = currentCurrency.code === 'JPY' ? 0 : decimals;

    return `${currentCurrency.symbol}${converted.toLocaleString(currentCurrency.locale, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: minDecimals
    })}`;
  };

  /**
   * Converts input entered in user's selected currency back to base INR amount for API storage.
   */
  const convertInputToINR = (inputAmount) => {
    const numericAmt = parseFloat(inputAmount || 0);
    if (!numericAmt) return 0;
    return numericAmt / currentCurrency.rate;
  };

  return (
    <CurrencyContext.Provider value={{
      currency: currentCurrency.code,
      currencySymbol: currentCurrency.symbol,
      currentCurrency,
      currencies: CURRENCIES,
      changeCurrency,
      formatCurrency,
      convertInputToINR
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
