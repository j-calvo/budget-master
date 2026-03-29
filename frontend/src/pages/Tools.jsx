import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { ArrowLeftRight, TrendingUp, Clock, Info, Calculator, Construction } from 'lucide-react';
import AmountInput from '../components/AmountInput';
import { formatCurrency } from '../lib/currencyUtils';

export default function Tools() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [ratesData, setRatesData] = useState(null);
  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('CRC');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const rateRes = await api.get('/currencies/rates');
        setRatesData(rateRes.data);
        
        if (settings?.defaultCurrency) {
          setFromCurrency(settings.defaultCurrency);
        }
      } catch (err) {
        console.error('Failed to load currency data', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [settings]);

  const convert = (val, from, to) => {
    if (!ratesData || !ratesData.rates) return val;
    const base = ratesData.base;
    if (from === base) {
      const rate = ratesData.rates[to];
      return rate ? val * rate : val;
    }
    if (to === base) {
      const rate = ratesData.rates[from];
      return rate ? val / rate : val;
    }
    const fromRate = ratesData.rates[from];
    const toRate = ratesData.rates[to];
    if (fromRate && toRate) {
      return (val / fromRate) * toRate;
    }
    return val;
  };

  const result = convert(amount, fromCurrency, toCurrency);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64 text-slate-400 font-medium italic">
      {t('Loading tools...')}
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-wide glow-text-white mb-2">{t('Financial Tools')}</h1>
          <p className="text-slate-400 font-serif italic text-sm">{t('Calculators and utilities for your wealth management')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Currency Converter */}
        <div className="space-y-6">
          <div className="glass-card p-8 h-full relative overflow-hidden group border-gold-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none"></div>
            
            <h2 className="text-2xl font-serif italic text-white flex items-center gap-3 mb-6">
              <span className="w-8 h-[1px] bg-gold-500/50 block"></span>
              {t('Currency Exchange')}
            </h2>

            <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-[0.2em] ml-1">
                  {t('Amount')}
                </label>
                <div className="relative">
                  <AmountInput
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-brand-900/60 border-2 border-brand-600/30 rounded-2xl p-4 text-2xl font-serif text-white focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 items-center gap-2">
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">{t('From')}</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full p-3 bg-brand-800/50 border border-brand-600/30 rounded-xl text-white text-sm focus:border-gold-500/50 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-900">{c.code}</option>)}
                  </select>
                </div>
                <div className="flex justify-center pt-5 col-span-1">
                  <button onClick={swapCurrencies} className="p-2 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-brand-900 transition-all shadow-lg active:scale-90">
                    <ArrowLeftRight size={16} />
                  </button>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">{t('To')}</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full p-3 bg-brand-800/50 border border-brand-600/30 rounded-xl text-white text-sm focus:border-gold-500/50 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-900">{c.code}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 p-6 rounded-3xl bg-gradient-to-b from-brand-900/40 to-transparent border border-white/5 text-center">
                <p className="text-3xl font-serif font-bold text-white tracking-tight break-all">
                  {formatCurrency(result, toCurrency, currencies, settings?.language)}
                </p>
                <div className="flex items-center justify-center gap-2 text-gold-400/60 text-xs font-serif italic mt-2">
                  <TrendingUp size={14} />
                  <span>1 {fromCurrency} = {(result / (amount || 1)).toFixed(4)} {toCurrency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Income Tax Calculator Pipeline */}
        <div className="space-y-6">
          <div className="glass-card p-8 h-full relative overflow-hidden group border-brand-600/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl transition-colors pointer-events-none"></div>
            
            <h2 className="text-2xl font-serif italic text-white flex items-center gap-3 mb-6 opacity-70">
              <span className="w-8 h-[1px] bg-slate-500/50 block"></span>
              {t('Income Tax Calculator')}
            </h2>

            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-6 border border-dashed border-slate-600/30 rounded-3xl bg-slate-900/20">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-2">
                <Construction size={28} />
              </div>
              <h3 className="text-xl font-serif text-slate-300 tracking-wide">{t('Coming Soon')}</h3>
              <p className="text-sm text-slate-500 max-w-xs">{t('We are currently building localized tax brackets to accurately calculate your net income.')}</p>
              
              <button disabled className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold tracking-widest uppercase cursor-not-allowed border border-slate-700">
                {t('In Development')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
