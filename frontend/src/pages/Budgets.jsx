import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import AmountInput from '../components/AmountInput';
import { formatCurrency as formatC } from '../lib/currencyUtils';

const API_URL = '/budgets';
const CATS_URL = '/categories';

export default function Budgets() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '', currency: 'CRC', payDay: '' });
  const [deleteData, setDeleteData] = useState({ id: null, name: null });
  const [isLoading, setIsLoading] = useState(true);

  // ── Time range state ──────────────────────────────────────────────────────
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear());

  const getEffectiveBudgetPeriod = (startDay = 1) => {
    const now = new Date();
    const day = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    if (startDay <= 1 || day < startDay) return { month: m, year: y };
    let effMonth = m + 1;
    let effYear = y;
    if (effMonth > 12) { effMonth = 1; effYear++; }
    return { month: effMonth, year: effYear };
  };

  const stepMonth = (dir) => {
    setViewMonth(prev => {
      let next = prev + dir;
      if (next < 1)  { setViewYear(y => y - 1); return 12; }
      if (next > 12) { setViewYear(y => y + 1); return  1; }
      return next;
    });
  };

  const jumpToToday = () => {
    const startDay = settings?.budgetStartDay || 1;
    const { month, year } = getEffectiveBudgetPeriod(startDay);
    setViewMonth(month);
    setViewYear(year);
  };

  useEffect(() => {
    fetchData();
  }, [viewMonth, viewYear]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [budRes, catRes] = await Promise.allSettled([
        api.get(`${API_URL}?month=${viewMonth}&year=${viewYear}`),
        api.get(CATS_URL)
      ]);

      if (budRes.status === 'fulfilled') {
        setBudgets(budRes.value.data);
      } else {
        console.error('Failed to fetch budgets:', budRes.reason);
      }

      if (catRes.status === 'fulfilled') {
        // Filter out income categories for budgeting
        const expCats = catRes.value.data.filter(c => c.type !== 'income');
        setCategories(expCats);
        if (expCats.length > 0) {
          setNewBudget(p => ({ ...p, categoryId: expCats[0].id }));
        }
      } else {
        console.error('Failed to fetch categories:', catRes.reason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        categoryId: newBudget.categoryId,
        amount: parseFloat(newBudget.amount) || 0,
        currency: newBudget.currency || 'CRC',
        payDay: newBudget.payDay ? parseInt(newBudget.payDay) : null
      };
      if (editingBudget) {
        await api.put(`${API_URL}/${editingBudget.id}`, payload);
      } else {
        await api.post(API_URL, { ...payload, month: viewMonth, year: viewYear });
      }
      setShowModal(false);
      setEditingBudget(null);
      setNewBudget(p => ({ ...p, amount: '', currency: 'CRC', payDay: '' }));
      fetchData();
    } catch (err) {
      console.error('Failed to save budget', err);
    }
  };

  const handleEditClick = (budget) => {
    setEditingBudget(budget);
    setNewBudget({
      categoryId: budget.categoryId,
      amount: budget.amount,
      currency: budget.currency || 'CRC',
      payDay: budget.payDay || ''
    });
    setShowModal(true);
  };

  const handleDeleteBudget = async () => {
    try {
      if(deleteData.id) await api.delete(`${API_URL}/${deleteData.id}`);
      setDeleteData({ id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete budget', err);
    }
  };

  const formatCurrency = (amount, currencyCode) => {
    return formatC(amount, currencyCode || settings?.defaultCurrency || 'USD', currencies, settings?.language);
  };

  const getBudgetStatus = (budget) => {
    const spent = parseFloat(budget.spent) || 0;
    const amount = parseFloat(budget.amount) || 0;
    const isFixed = budget.category?.type === 'fixed_expense';
    
    if ((spent >= amount && amount > 0) || (isFixed && spent > 0)) return 'PAID';
    
    const today = new Date();
    const currentDay = today.getDate();
    const { month: currentMonth, year: currentYear } = getEffectiveBudgetPeriod(settings?.budgetStartDay || 1);
    
    // Status Logic relative to VIEW
    const isPast = viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth);
    const isFuture = viewYear > currentYear || (viewYear === currentYear && viewMonth > currentMonth);
    const isCurrent = viewYear === currentYear && viewMonth === currentMonth;

    if (budget.payDay) {
      if (isPast && spent < amount) return 'OVERDUE';
      if (isCurrent) {
        if (currentDay > budget.payDay && spent < amount) return 'OVERDUE';
      }
      if (isFuture) return 'PENDING';
    }
    
    if (spent > 0 && spent < amount) return 'PARTIAL';
    return 'PENDING';
  };

  const statusBadge = (status) => {
    const config = {
      PAID:    { label: t('Paid'),    classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
      PARTIAL: { label: t('Partial'), classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
      OVERDUE: { label: t('Overdue'), classes: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
      PENDING: { label: t('Pending'), classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
    }[status] || { label: status, classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.12em] border ${config.classes}`}>
        {status === 'PAID' && <span className="mr-1">✓</span>}
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-2">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-wide">{t('Budgets')}</h1>
          <p className="text-xs md:text-sm font-medium text-slate-400 mt-1">
            {t('Manage your monthly spending limits')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-brand-900/60 p-1 rounded-xl border border-brand-600/30">
            <button onClick={() => stepMonth(-1)} className="p-2 text-slate-400 hover:text-white transition-all"><span className="text-lg">‹</span></button>
            <button onClick={jumpToToday} className="px-3 py-1 text-[10px] font-bold text-gold-400 hover:text-gold-200 uppercase tracking-widest transition-all">
              {new Date(viewYear, viewMonth - 1).toLocaleString(settings?.language || 'en-US', { month: 'long', year: 'numeric' })}
            </button>
            <button onClick={() => stepMonth(1)} className="p-2 text-slate-400 hover:text-white transition-all"><span className="text-lg">›</span></button>
          </div>

          <button onClick={() => {
            setEditingBudget(null);
            setNewBudget(p => ({ ...p, amount: '', currency: 'CRC', payDay: '' }));
            setShowModal(true);
          }} className="btn-gold px-4 md:px-5 py-2 text-xs md:text-sm shadow-md flex items-center gap-1 shrink-0">
            <span className="text-lg leading-none">+</span> <span className="hidden sm:inline">{t('Create Budget')}</span><span className="sm:hidden">{t('New')}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
        </div>
      ) : budgets.length === 0 ? (
        <div className="glass-card p-12 md:p-16 text-center border border-dashed border-brand-600">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-600/30 flex items-center justify-center text-gold-400/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-slate-400 font-serif italic text-lg mb-6">{t('No budgets set for this month.')}</p>
          <button onClick={() => setShowModal(true)} className="btn-glass px-6 py-2">
            {t('Create Your First Budget')}
          </button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">

          {/* ═══ MOBILE: Card-based layout ═══ */}
          <div className="md:hidden space-y-3">
            {budgets.map((budget, idx) => {
              const pct = Math.min(100, Math.round((budget.spent / budget.amount) * 100)) || 0;
              const isOver = budget.spent > budget.amount;
              const remaining = budget.amount - budget.spent;
              const status = getBudgetStatus(budget);
              
              // Color scheme based on usage
              const barBg = isOver 
                ? 'bg-rose-500' 
                : pct > 75 ? 'bg-amber-500' : 'bg-gold-500';
              const barGlow = isOver 
                ? 'shadow-[0_0_12px_rgba(244,63,94,0.5)]' 
                : pct > 75 ? 'shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_12px_rgba(212,175,55,0.4)]';
              
              return (
                <div 
                  key={budget.id} 
                  className="glass-card p-0 overflow-hidden border-brand-600/30 relative group"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Category color accent */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: budget.category?.color || '#d4af37' }}
                  />
                  
                  <div className="pl-5 pr-4 py-4">
                    {/* Row 1: Category + Status + Percentage badge */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ 
                            backgroundColor: `${budget.category?.color || '#d4af37'}15`,
                            color: budget.category?.color || '#d4af37',
                            border: `1px solid ${budget.category?.color || '#d4af37'}30`
                          }}
                        >
                          {budget.category?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-serif text-white text-[15px] tracking-wide truncate">{budget.category?.name}</p>
                            {statusBadge(status)}
                          </div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                            {formatCurrency(budget.amount, budget.currency)}{budget.payDay ? ` · Day ${budget.payDay}` : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Percentage badge */}
                      <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums shrink-0 ml-2 ${
                        isOver 
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' 
                          : pct > 75 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {pct}%
                      </div>
                    </div>

                    {/* Row 2: Progress bar */}
                    <div className="mb-3">
                      <div className="w-full bg-brand-900/60 rounded-full h-2 overflow-hidden border border-brand-600/30">
                        <div 
                          className={`${barBg} ${barGlow} h-full rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Row 3: Spent / Remaining + Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-0.5">{t('Spent')}</p>
                          <p className={`text-sm font-serif tabular-nums ${isOver ? 'text-rose-300' : 'text-white'}`}>
                            {formatCurrency(budget.spent, budget.currency)}
                          </p>
                        </div>
                        <div className="border-l border-brand-600/40 pl-4">
                          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-0.5">{t('Remaining')}</p>
                          <p className={`text-sm font-serif font-medium tabular-nums ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOver 
                              ? `−${formatCurrency(Math.abs(remaining), budget.currency)}` 
                              : formatCurrency(remaining, budget.currency)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action buttons — always visible on mobile */}
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEditClick(budget)}
                          className="p-2 text-slate-400 hover:text-gold-400 rounded-lg hover:bg-white/5 transition-colors active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => setDeleteData({ id: budget.id, name: budget.category?.name })}
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ DESKTOP: Table layout ═══ */}
          <div className="hidden md:block glass-card overflow-hidden border-brand-600/30 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            {/* Auto-tracking disclaimer */}
            <div className="px-8 pt-4 pb-3 border-b border-brand-600/20 flex items-center gap-2">
              <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[10px] text-slate-500 tracking-wide">{t('Auto-tracked via categorized transactions')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-900/80 border-b border-brand-600/30 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                    <th className="p-5 pl-8">{t('Category')}</th>
                    <th className="p-5">{t('Budgeted')}</th>
                    <th className="p-5">{t('Spent')}</th>
                    <th className="p-5">{t('Remaining')}</th>
                    <th className="p-5 w-[30%]">{t('Utilization')}</th>
                    <th className="p-5 pr-8 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-600/20">
                  {budgets.map(budget => {
                    const pct = Math.min(100, Math.round((budget.spent / budget.amount) * 100)) || 0;
                    const isOver = budget.spent > budget.amount;
                    const status = getBudgetStatus(budget);
                    const barColor = isOver ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : (pct > 75 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)]');
                    const textColor = isOver ? 'text-rose-400' : 'text-slate-400';
                    const valueColor = isOver ? 'text-rose-300' : 'text-white';
                    const remaining = budget.amount - budget.spent;

                    return (
                      <tr key={budget.id} className="hover:bg-white/[0.02] transition-colors group relative">
                        <td className="p-5 pl-8">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: budget.category?.color || '#d4af37' }} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif italic text-white text-[17px] tracking-wide">
                                  {budget.category?.name}
                                </span>
                                {statusBadge(status)}
                              </div>
                              {budget.payDay && <p className="text-[10px] text-slate-500 mt-0.5">Day {budget.payDay}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-serif text-slate-300">{formatCurrency(budget.amount, budget.currency)}</span>
                        </td>
                        <td className="p-5">
                          <span className={`font-serif ${valueColor}`}>{formatCurrency(budget.spent, budget.currency)}</span>
                        </td>
                        <td className="p-5">
                          <span className={`font-serif font-medium ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOver ? formatCurrency(Math.abs(remaining), budget.currency) + ' ' + t('Over') : formatCurrency(remaining, budget.currency)}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 bg-brand-900/50 rounded-full h-1.5 overflow-hidden border border-brand-600/30">
                              <div className={`${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className={`text-[11px] font-bold w-10 text-right ${textColor}`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="p-5 pr-8 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditClick(budget)}
                              className="p-2 text-slate-400 hover:text-gold-400 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => setDeleteData({ id: budget.id, name: budget.category?.name })}
                              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ Summary Cards ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Object.entries(
              budgets.reduce((acc, b) => {
                if (!acc[b.currency]) acc[b.currency] = { budgeted: 0, spent: 0 };
                acc[b.currency].budgeted += parseFloat(b.amount) || 0;
                acc[b.currency].spent += parseFloat(b.spent) || 0;
                return acc;
              }, {})
            ).map(([curr, data]) => {
              const isOver = data.spent > data.budgeted;
              const pct = Math.min(100, Math.round((data.spent / data.budgeted) * 100)) || 0;
              return (
                <div key={curr} className="glass-card p-5 md:p-6 border-brand-600/30 group relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen group-hover:bg-gold-500/10 transition-all"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1">{t('Total in')} {curr}</h4>
                      <p className="text-xl md:text-2xl font-serif text-white">{formatCurrency(data.budgeted, curr)}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      isOver 
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {pct}%
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full bg-brand-900/60 rounded-full h-1.5 overflow-hidden border border-brand-600/30 mb-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'bg-gold-500 shadow-[0_0_6px_rgba(212,175,55,0.4)]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-baseline">
                    <p className={`text-xs font-medium ${isOver ? 'text-rose-400' : 'text-slate-300'}`}>
                      {formatCurrency(data.spent, curr)} {t('spent')}
                    </p>
                    <p className={`text-[11px] font-bold tracking-wider uppercase ${isOver ? 'text-rose-500' : 'text-emerald-400'}`}>
                      {isOver 
                        ? t('Over by {{amt}}', { amt: formatCurrency(data.spent - data.budgeted, curr) }) 
                        : t('{{amt}} left', { amt: formatCurrency(data.budgeted - data.spent, curr) })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {editingBudget ? t('Edit Budget') : t('Set Budget')}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>

            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Category')}</label>
                <select 
                  value={newBudget.categoryId} 
                  onChange={e => setNewBudget({...newBudget, categoryId: e.target.value})} 
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  required
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-brand-800">{cat.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Monthly Amount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">
                    {currencies.find(c => c.code === (newBudget.currency || 'CRC'))?.symbol || '₡'}
                  </span>
                  <AmountInput 
                    required 
                    value={newBudget.amount} 
                    onChange={e => setNewBudget({...newBudget, amount: e.target.value})} 
                    className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Currency')}</label>
                  <select 
                    value={newBudget.currency || 'CRC'} 
                    onChange={e => setNewBudget({...newBudget, currency: e.target.value})} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  >
                    {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-800">{c.code} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Pay Day (Optional)')}</label>
                  <AmountInput 
                    value={newBudget.payDay || ''} 
                    onChange={e => setNewBudget({...newBudget, payDay: e.target.value})} 
                    className="w-full px-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all" 
                    placeholder="1-31" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => { setShowModal(false); setEditingBudget(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-6 py-2 text-sm">{editingBudget ? t('Save Changes') : t('Save Budget')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteData.id && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-sm text-center border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif text-white mb-2 tracking-wide">{t('Delete Budget?')}</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t('Are you sure you want to delete the "{{name}}" budget? This action cannot be undone.', { name: deleteData.name })}</p>
            
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setDeleteData({ id: null, name: null })} 
                className="btn-glass px-4 py-2.5 flex-1 text-sm tracking-wide"
              >
                {t('Cancel')}
              </button>
              <button 
                onClick={handleDeleteBudget} 
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-lg transition-colors flex-1 text-sm font-medium shadow-[0_0_15px_rgba(244,63,94,0.3)] tracking-wide"
              >
                {t('Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
