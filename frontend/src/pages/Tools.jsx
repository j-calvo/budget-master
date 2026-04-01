import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { ArrowLeftRight, TrendingUp, Clock, Info, Calculator, Construction } from 'lucide-react';
import AmountInput from '../components/AmountInput';
import { formatCurrency } from '../lib/currencyUtils';
import { calculateSalaryCR } from '../lib/salaryUtils';

export default function Tools() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('salary');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pb-24 px-4 sm:px-6">
      <div className="text-center md:text-left pt-4">
        <h1 className="text-4xl font-serif text-white tracking-wide glow-text-white mb-2">{t('Financial Tools')}</h1>
        <p className="text-slate-400 font-serif italic text-sm">{t('Calculators and utilities for your wealth management')}</p>
      </div>

      <div className="flex bg-brand-900/60 p-1.5 rounded-2xl border border-brand-600/30 shadow-inner w-full max-w-md mx-auto md:mx-0 relative z-10">
        {[
          { id: 'salary', name: 'Estimator', icon: <Calculator size={18} /> },
          { id: 'exchange', name: 'Exchange', icon: <ArrowLeftRight size={18} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-gold-500 text-brand-900 shadow-[0_4px_12px_rgba(212,175,55,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {t(tab.name)}
          </button>
        ))}
      </div>

      <div className="mt-4 transition-all duration-500">
        {activeTab === 'exchange' ? (
          <CurrencyConverter />
        ) : (
          <SalaryEstimator />
        )}
      </div>
    </div>
  );
}

function CurrencyConverter() {
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
        if (settings?.defaultCurrency) setFromCurrency(settings.defaultCurrency);
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
    let rate;
    if (from === base) rate = ratesData.rates[to];
    else if (to === base) rate = 1 / ratesData.rates[from];
    else rate = ratesData.rates[to] / ratesData.rates[from];
    return rate ? val * rate : val;
  };

  const result = convert(amount, fromCurrency, toCurrency);
  const swapCurrencies = () => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); };

  if (isLoading) return <div className="flex justify-center items-center h-64 text-slate-400 font-medium italic">{t('Loading rates...')}</div>;

  return (
    <div className="glass-card p-6 sm:p-10 relative overflow-hidden group border-gold-500/20 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl transition-colors pointer-events-none"></div>
      
      <h2 className="text-2xl font-serif italic text-white flex items-center gap-3 mb-10">
        <span className="w-10 h-[1px] bg-gold-500/50 block"></span>
        {t('Currency Exchange')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-[0.2em] ml-1">{t('Amount')}</label>
            <AmountInput
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-brand-900/60 border-2 border-brand-600/30 rounded-3xl p-6 md:p-8 text-4xl md:text-5xl font-serif text-white focus:border-gold-500/50 outline-none transition-all shadow-inner"
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest ml-1">{t('From')}</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full p-4 bg-brand-800/50 border border-brand-600/30 rounded-2xl text-white text-lg focus:border-gold-500/50 outline-none appearance-none cursor-pointer"
              >
                {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-900">{c.code}</option>)}
              </select>
            </div>
            <div className="pt-6">
              <button onClick={swapCurrencies} className="p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-brand-900 transition-all shadow-lg active:scale-90">
                <ArrowLeftRight size={20} />
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest ml-1">{t('To')}</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full p-4 bg-brand-800/50 border border-brand-600/30 rounded-2xl text-white text-lg focus:border-gold-500/50 outline-none appearance-none cursor-pointer"
              >
                {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-900">{c.code}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-10 rounded-[40px] bg-gradient-to-br from-brand-900/60 to-brand-800/20 border border-white/5 shadow-2xl relative">
          <div className="absolute top-4 right-8 flex items-center gap-2 text-gold-400/40 text-[10px] font-serif italic">
            <TrendingUp size={14} />
            <span>1 {fromCurrency} = {(result / (amount || 1)).toFixed(4)} {toCurrency}</span>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 opacity-60 font-serif italic">{t('Converted Amount')}</p>
          <p className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tight break-all text-center">
            {formatCurrency(result, toCurrency, currencies, settings?.language)}
          </p>
          <div className="mt-8 pt-6 border-t border-white/5 w-full text-center">
            <p className="text-xs text-slate-500 font-serif italic">{t('Real-time rates from international markets')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalaryEstimator() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [inputs, setInputs] = useState({
    baseSalary: 0,
    bonuses: 0,
    rpc: 0,
    children: 0,
    spouse: false,
    year: '2026',
    frequency: 'monthly'
  });

  const [results, setResults] = useState(null);

  useEffect(() => {
    const res = calculateSalaryCR(inputs);
    setResults(res);
  }, [inputs]);

  const updateInput = (key, val) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  };

  const frequencyLabels = {
    monthly: t('Monthly'),
    biweekly: t('Bi-weekly'),
    weekly: t('Weekly')
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      <div className="glass-card p-6 sm:p-10 h-full relative overflow-hidden group border-brand-600/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl transition-colors pointer-events-none"></div>
        
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-serif italic text-white flex items-center gap-3">
            <span className="w-8 h-[1px] bg-emerald-500/50 block"></span>
            {t('Salary Estimator')}
          </h2>
          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-brand-900/60 p-1 rounded-xl border border-brand-600/30">
              {['2025', '2026'].map(y => (
                <button
                  key={y}
                  onClick={() => updateInput('year', y)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    inputs.year === y ? 'bg-gold-500 text-brand-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Frequency Selector */}
        <div className="mb-6">
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-[0.2em] ml-1">{t('Frequency')}</label>
          <div className="grid grid-cols-3 gap-2 bg-brand-900/40 p-1 rounded-2xl border border-brand-600/20">
            {['monthly', 'biweekly', 'weekly'].map(f => (
              <button
                key={f}
                onClick={() => updateInput('frequency', f)}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
                  inputs.frequency === f ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t(f.charAt(0).toUpperCase() + f.slice(1))}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest ml-1">
              {frequencyLabels[inputs.frequency]} {t('Base Salary')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₡</span>
              <AmountInput
                value={inputs.baseSalary}
                onChange={v => updateInput('baseSalary', v.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-brand-900/40 border border-brand-600/30 rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-white transition-all font-serif text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest ml-1">
              {t('Bonuses & Allowances')} ({frequencyLabels[inputs.frequency]})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₡</span>
              <AmountInput
                value={inputs.bonuses}
                onChange={v => updateInput('bonuses', v.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-brand-900/40 border border-brand-600/30 rounded-xl focus:border-emerald-500/50 outline-none text-white transition-all font-serif text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest ml-1">{t('Complementary Pension (RPC)')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₡</span>
              <AmountInput
                value={inputs.rpc}
                onChange={v => updateInput('rpc', v.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-brand-900/40 border border-brand-600/30 rounded-xl focus:border-emerald-500/50 outline-none text-white transition-all font-serif text-sm"
                placeholder="0.00"
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1 italic ml-1">{t('Deductible up to 10% of gross')}</p>
          </div>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('Calculate Spouse Credit')}</span>
              <button
                type="button"
                onClick={() => updateInput('spouse', !inputs.spouse)}
                className={`w-10 h-5 rounded-full transition-all relative ${inputs.spouse ? 'bg-emerald-500' : 'bg-brand-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${inputs.spouse ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('Number of Children')}</span>
              <div className="flex items-center bg-brand-900/60 rounded-lg border border-brand-600/30 p-0.5">
                <button onClick={() => updateInput('children', Math.max(0, inputs.children - 1))} className="px-2 py-0.5 text-slate-400 hover:text-white">-</button>
                <span className="px-2 text-xs text-white min-w-8 text-center">{inputs.children}</span>
                <button onClick={() => updateInput('children', inputs.children + 1)} className="px-2 py-0.5 text-slate-400 hover:text-white">+</button>
              </div>
            </div>
          </div>
        </div>

        {results && (
          <div className="flex-1 flex flex-col space-y-6">
            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-[0.3em] mb-1">
                {inputs.frequency === 'monthly' ? t('Monthly Net Salary') : t('Net Period Salary')}
              </p>
              <h3 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                {formatCurrency(results.net, 'CRC', currencies, settings?.language)}
              </h3>
              {inputs.frequency !== 'monthly' && (
                <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-emerald-500/60 font-serif italic">
                  <span>{t('Monthly Equivalent')}: {formatCurrency(results.monthlyEquivalent, 'CRC', currencies, settings?.language)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3 p-4 rounded-2xl bg-brand-900/40 border border-brand-600/20">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('Calculations')}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{t('Gross Salary')}</span>
                  <span className="text-white font-medium">{formatCurrency(results.gross, 'CRC', currencies, settings?.language)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{t('Aguinaldo Provision')} ({frequencyLabels[inputs.frequency] || ''})</span>
                  <span className="text-gold-400/80 italic">~{formatCurrency(results.aguinaldoProvision, 'CRC', currencies, settings?.language)}</span>
                </div>
                {results.rpcExemption > 0 && (
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-brand-600/10">
                    <span className="text-emerald-400/80 italic">{t('RPC Exemption')}</span>
                    <span className="text-emerald-400/80 font-medium">-{formatCurrency(results.rpcExemption, 'CRC', currencies, settings?.language)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4 rounded-2xl bg-brand-900/40 border border-brand-600/20">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('Deductions')}</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] mb-2 border-b border-brand-600/10 pb-1">
                    <span className="text-slate-300 font-bold tracking-wide italic">{t('Total CCSS')}</span>
                    <span className="text-rose-400/90 font-bold">-{formatCurrency(results.ccss, 'CRC', currencies, settings?.language)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 italic">SEM ({t('Salud')}) - 5.50%</span>
                    <span className="text-rose-400/80">-{formatCurrency(results.sem, 'CRC', currencies, settings?.language)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 italic">IVM ({t('Pension')}) - {inputs.year === '2026' ? '4.33%' : '4.17%'}</span>
                    <span className="text-rose-400/80">-{formatCurrency(results.ivm, 'CRC', currencies, settings?.language)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 italic">Banco Popular - 1.00%</span>
                    <span className="text-rose-400/80">-{formatCurrency(results.popular, 'CRC', currencies, settings?.language)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-brand-600/10">
                    <span className="text-slate-400 italic font-medium">{t('Income Tax (Renta)')}</span>
                    <span className="text-rose-400/80">-{formatCurrency(results.renta, 'CRC', currencies, settings?.language)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 flex justify-between items-center border-t border-brand-600/20">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Info size={12} />
                <span>{t('Based on Costa Rican law')} ({inputs.year})</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
