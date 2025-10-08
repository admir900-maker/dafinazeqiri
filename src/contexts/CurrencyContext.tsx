'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  setCurrency: (currency: string) => void;
  formatPrice: (price: number) => string;
  getCurrencyInfo: (currencyCode: string) => { symbol: string; name: string };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const currencyData: { [key: string]: { symbol: string; name: string } } = {
  'USD': { symbol: '$', name: 'US Dollar' },
  'usd': { symbol: '$', name: 'US Dollar' },
  'EUR': { symbol: '€', name: 'Euro' },
  'eur': { symbol: '€', name: 'Euro' },
  'GBP': { symbol: '£', name: 'British Pound' },
  'gbp': { symbol: '£', name: 'British Pound' },
  'CAD': { symbol: 'C$', name: 'Canadian Dollar' },
  'cad': { symbol: 'C$', name: 'Canadian Dollar' },
  'AUD': { symbol: 'A$', name: 'Australian Dollar' },
  'aud': { symbol: 'A$', name: 'Australian Dollar' }
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>('EUR');
  const [currencySymbol, setCurrencySymbol] = useState<string>('€');

  // Fetch current currency from payment settings
  const fetchCurrency = async () => {
    try {
      const res = await fetch('/api/currency');
      if (res.ok) {
        const data = await res.json();
        const selectedCurrency = data.currency || 'eur';
        const selectedSymbol = data.currencySymbol || '€';
        console.log('💰 Loaded currency from database:', selectedCurrency, selectedSymbol);
        setCurrencyState(selectedCurrency.toUpperCase());
        setCurrencySymbol(selectedSymbol);
      }
    } catch (error) {
      console.error('Error fetching currency settings:', error);
      // Use default values
    }
  };

  useEffect(() => {
    fetchCurrency();
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    setCurrencySymbol(currencyData[newCurrency]?.symbol || '$');
  };

  const formatPrice = (price: number): string => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  const getCurrencyInfo = (currencyCode: string) => {
    return currencyData[currencyCode] || { symbol: '$', name: 'US Dollar' };
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol,
        setCurrency,
        formatPrice,
        getCurrencyInfo
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}