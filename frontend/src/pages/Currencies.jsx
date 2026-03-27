import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { ArrowLeftRight, TrendingUp, Clock, Info } from 'lucide-react';

export default function Currencies() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [currencies, setCurrencies] = useState([]);
  const [ratesData, setRatesData] = useState(null);
  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('CRC');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [currRes, rateRes] = await Promise.all([
          api.get('/currencies'),
          api.get('/currencies/rates')
        ]);
        setCurrencies(currRes.data);
        setRatesData(rateRes.data);
        
        // Use default currency as initial 'From'
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
    
    // All rates in ratesData.rates are relative to ratesData.base
    const base = ratesData.base;
    
    // If we're converting FROM the base currency
    if (from === base) {
      const rate = ratesData.rates[to];
      return rate ? val * rate : val;
    }
    
    // If we're converting TO the base currency
    if (to === base) {
      const rate = ratesData.rates[from];
      return rate ? val / rate : val;
    }
    
    // Cross-conversion: from -> base -> to
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
    <div className="flex justify-center items-center h-64 text-slate-500 font-medium italic">
      {t('Loading converter...')}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-wide glow-text-white mb-2">{t('Currency Converter')}</h1>
          <p className="text-slate-400 font-serif italic text-sm">{t('Real-time exchange rates for your configured currencies')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Main Calculator */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-8 md:p-10 relative overflow-hidden group border-gold-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none"></div>
            
            <div className="space-y-8 relative z-10">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-[0.2em] ml-1">
                  {t('Amount to Convert')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-brand-900/60 border-2 border-brand-600/30 rounded-2xl p-6 text-4xl font-serif text-white focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all shadow-inner"
                    placeholder="0.00"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gold-400 font-serif text-2xl opacity-50">
                    {currencies.find(c => c.code === fromCurrency)?.symbol || '$'}
                  </div>
                </div>
              </div>

              {/* Conversion Controls */}
              <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">{t('From')}</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full p-4 bg-brand-800/50 border border-brand-600/30 rounded-xl text-white font-medium focus:border-gold-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-brand-700/50"
                  >
                    {currencies.map(c => (
                      <option key={c.id} value={c.code} className="bg-brand-900">{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center pt-6">
                  <button
                    onClick={swapCurrencies}
                    className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 hover:bg-gold-500 hover:text-brand-900 transition-all shadow-lg active:scale-90"
                  >
                    <ArrowLeftRight size={20} />
                  </button>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">{t('To')}</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full p-4 bg-brand-800/50 border border-brand-600/30 rounded-xl text-white font-medium focus:border-gold-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-brand-700/50"
                  >
                    {currencies.map(c => (
                      <option key={c.id} value={c.code} className="bg-brand-900">{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result Display */}
              <div className="pt-8 border-t border-brand-600/20 mt-4">
                <div className="flex flex-col items-center justify-center space-y-2 p-8 rounded-3xl bg-gradient-to-b from-brand-900/40 to-transparent border border-white/5">
                  <p className="text-slate-400 text-sm font-serif italic">{amount} {fromCurrency} {t('equals')}</p>
                  <p className="text-6xl md:text-7xl font-serif font-bold text-white tracking-tight break-all text-center">
                    {new Intl.NumberFormat(settings?.language || 'en-US', {
                      style: 'currency',
                      currency: toCurrency
                    }).format(result)}
                  </p>
                  <div className="flex items-center gap-2 text-gold-400/60 text-xs font-serif italic mt-4">
                    <TrendingUp size={14} />
                    <span>1 {fromCurrency} = {(result / (amount || 1)).toFixed(4)} {toCurrency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 flex items-center gap-4 border-brand-600/20">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t('Market Data Status')}</p>
              <p className="text-sm text-slate-300 font-medium">
                {t('Last updated')}: {ratesData?.updatedAt ? new Date(ratesData.updatedAt).toLocaleString() : t('Real-time')}
              </p>
            </div>
          </div>
        </div>

        {/* Side Info / Quick Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border-brand-600/20 h-full flex flex-col">
            <h2 className="text-lg font-serif italic text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-[1px] bg-gold-500/50 block"></span>
              {t('Conversion Guide')}
            </h2>
            
            <div className="space-y-4 flex-1">
              {[1, 10, 50, 100, 500, 1000].map(val => (
                <div key={val} className="flex justify-between items-center p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group">
                  <span className="text-slate-400 font-medium group-hover:text-white transition-colors">
                    {val} {fromCurrency}
                  </span>
                  <span className="text-gold-400 font-serif font-bold">
                    {new Intl.NumberFormat(settings?.language || 'en-US', {
                      style: 'currency',
                      currency: toCurrency
                    }).format(convert(val, fromCurrency, toCurrency))}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
              <Info className="text-blue-400 shrink-0" size={18} />
              <p className="text-[11px] text-slate-400 leading-relaxed font-serif italic">
                {t('Rates are provided by mid-market data and may vary by provider. Your preferred display currency is currently set to')} <span className="text-gold-400 font-bold">{settings?.defaultCurrency || 'USD'}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
