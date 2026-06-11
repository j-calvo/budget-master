import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency as formatC } from '../lib/currencyUtils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line, ReferenceLine
} from 'recharts';

export default function Analytics() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [ratesData, setRatesData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUnbudgeted, setExpandedUnbudgeted] = useState({});

  // ── Time range state ──────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState('6M');
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());   // 0-indexed
  const [viewYear,  setViewYear]  = useState(now.getFullYear());

  const isMonthMode = timeRange === 'MONTH';

  const stepMonth = (dir) => {
    setViewMonth(prev => {
      const next = prev + dir;
      if (next < 0)  { setViewYear(y => y - 1); return 11; }
      if (next > 11) { setViewYear(y => y + 1); return  0; }
      return next;
    });
  };

  // Cannot navigate into the future
  const isNextDisabled = isMonthMode && (
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth >= now.getMonth())
  );
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      try {
        const [txRes, catRes, budgRes, rateRes, accRes, adjRes] = await Promise.all([
          api.get('/transactions'),
          api.get('/categories'),
          api.get('/budgets'),
          api.get('/currencies/rates'),
          api.get('/accounts'),
          api.get('/accounts/adjustments/all')
        ]);
        setTransactions(txRes.data);
        setCategories(catRes.data);
        setBudgets(budgRes.data);
        setRatesData(rateRes.data);
        setAccounts(accRes.data);
        setAdjustments(adjRes.data);
      } catch (err) {
        console.error('Failed to load analytics data', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (amount) =>
    formatC(amount, settings?.defaultCurrency || 'USD', currencies, settings?.language);

  // ── Filter transactions ───────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    if (isMonthMode) {
      const start = new Date(viewYear, viewMonth, 1);
      const end   = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59, 999);
      return transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    }
    const d = new Date();
    if (timeRange === '1M') d.setMonth(d.getMonth() - 1);
    else if (timeRange === '3M') d.setMonth(d.getMonth() - 3);
    else if (timeRange === '6M') d.setMonth(d.getMonth() - 6);
    else if (timeRange === '1Y') d.setFullYear(d.getFullYear() - 1);
    else return transactions; // ALL
    return transactions.filter(tx => new Date(tx.date) >= d);
  }, [transactions, timeRange, isMonthMode, viewMonth, viewYear]);

  const expenses = filteredTx.filter(tx => tx.type === 'expense' && tx.category?.type !== 'income');

  const convert = (amount, fromCode) => {
    if (!ratesData?.rates || fromCode === ratesData.base) return amount;
    const rate = ratesData.rates[fromCode];
    return rate ? amount / rate : amount;
  };

  // 1. Spending by Category (Pie)
  const spendByCat   = {};
  const spendByCatId = {};
  
  filteredTx.forEach(tx => {
    const catName = tx.category?.name || 'Uncategorized';
    const catId   = tx.category?.id  || 'uncategorized';
    const catType = tx.category?.type;
    const txCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
    const amt = convert(tx.amount, txCurrency);
    
    if (tx.type === 'expense') {
      if (catType !== 'income') {
        spendByCat[catName]  = (spendByCat[catName]  || 0) + amt;
        spendByCatId[catId]  = (spendByCatId[catId]  || 0) + amt;
      }
    } else if (tx.type === 'income') {
      if (catType && catType !== 'income') {
        spendByCat[catName]  = (spendByCat[catName]  || 0) - amt;
        spendByCatId[catId]  = (spendByCatId[catId]  || 0) - amt;
      }
    }
  });

  const categoryData = Object.entries(spendByCat)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const COLORS = ['#d4af37','#10b981','#0ea5e9','#f43f5e','#a855f7','#14b8a6','#f59e0b','#6366f1','#ec4899'];

  // 2. Income vs Expenses — grouped by month
  const barData = useMemo(() => {
    const flows = {};
    if (isMonthMode) {
      const key = new Date(viewYear, viewMonth, 1)
        .toLocaleString(settings?.language || 'en-US', { month: 'short', year: '2-digit' });
      flows[key] = { name: key, income: 0, expenses: 0 };
    } else {
      const count = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString(settings?.language || 'en-US', { month: 'short', year: '2-digit' });
        flows[key] = { name: key, income: 0, expenses: 0 };
      }
    }
    filteredTx.forEach(tx => {
      const key = new Date(tx.date)
        .toLocaleString(settings?.language || 'en-US', { month: 'short', year: '2-digit' });
      if (flows[key]) {
        const txCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
        const amt = convert(tx.amount, txCurrency);
        if (tx.type === 'income') {
          if (tx.category?.type === 'income' || !tx.category) flows[key].income += amt;
          else flows[key].expenses -= amt;
        } else if (tx.type === 'expense') {
          if (tx.category?.type === 'income') flows[key].income -= amt;
          else flows[key].expenses += amt;
        }
      }
    });
    return Object.values(flows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTx, timeRange, isMonthMode, viewMonth, viewYear, settings?.language]);

  // MoM Savings Rate & Liquid Cash Trend Data
  const trendData = useMemo(() => {
    if (isMonthMode) return [];
    
    // 1. Determine the months list (in chronological order)
    const months = [];
    const count = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        date: d,
        key: d.toLocaleString(settings?.language || 'en-US', { month: 'short', year: '2-digit' }),
        endOfMonthDate: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      });
    }

    // Calculate savings rate and project liquid cash for each month in months list
    return months.map(m => {
      // Calculate Income vs Expenses for this month specifically from all transactions
      let income = 0;
      let expenses = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        const startOfMonth = new Date(m.date.getFullYear(), m.date.getMonth(), 1);
        const endOfMonth = m.endOfMonthDate;

        if (txDate >= startOfMonth && txDate <= endOfMonth) {
          const txCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
          const amt = convert(tx.amount, txCurrency);
          if (tx.type === 'income') {
            if (tx.category?.type === 'income' || !tx.category) income += amt;
            else expenses -= amt;
          } else if (tx.type === 'expense') {
            if (tx.category?.type === 'income') income -= amt;
            else expenses += amt;
          }
        }
      });

      // Calculate Savings Rate %: (Income - Expenses) / Income * 100
      let savingsRate = 0;
      const absoluteSavings = income - expenses;
      if (income > 0) {
        savingsRate = Math.max(-100, Math.min(100, (absoluteSavings / income) * 100));
      } else {
        // Treat as 0% when income is 0, as per user specification
        savingsRate = 0;
      }

      // Calculate Projected Cash available at end of this month
      // Start from the current balance of liquid accounts, roll back transactions/adjustments after this month
      let totalLiquidCash = 0;
      
      accounts.forEach(acc => {
        if (acc.isLiquid === false) return; // Only process liquid accounts
        
        let projectedBalance = parseFloat(acc.balance) || 0;
        const currentCurrency = acc.currency || 'USD';

        // 1. Roll back transactions that happened AFTER the end of this month
        transactions.forEach(tx => {
          if (tx.accountId !== acc.id) return;
          const txDate = new Date(tx.date);
          if (txDate > m.endOfMonthDate) {
            // Revert transaction effect on balance
            if (tx.type === 'expense') {
              projectedBalance += tx.amount; // Add back expenses
            } else if (tx.type === 'income') {
              projectedBalance -= tx.amount; // Subtract incomes
            }
          }
        });

        // 2. Roll back adjustments that happened AFTER the end of this month
        adjustments.forEach(adj => {
          if (adj.accountId !== acc.id) return;
          const adjDate = new Date(adj.date);
          if (adjDate > m.endOfMonthDate) {
            // Revert adjustment: adjustments are saved with signs (positive = added, negative = subtracted)
            projectedBalance -= adj.amount;
          }
        });

        // Convert the balance of this account to Default/Base Currency
        totalLiquidCash += convert(projectedBalance, currentCurrency);
      });

      return {
        name: m.key,
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        absoluteSavings,
        income,
        expenses,
        liquidCash: parseFloat(totalLiquidCash.toFixed(2))
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, accounts, adjustments, timeRange, isMonthMode, viewMonth, viewYear, settings?.language, ratesData]);

  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const unbudgetedExpenses = useMemo(() => {
    // Filter out virtual budgets (amount === 0, isVirtual) — those are NOT real budgets
    const realBudgets = budgets.filter(b => !b.isVirtual && b.amount > 0);
    const budgetedCatIds = new Set(realBudgets.map(b => b.categoryId));
    const unbudgetedMap = {};

    filteredTx.forEach(tx => {
      if (tx.type !== 'expense' || tx.category?.type === 'income') return;
      const catId = tx.category?.id || 'uncategorized';
      const catName = tx.category?.name || t('Uncategorized');

      if (!budgetedCatIds.has(catId)) {
        const txCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
        const amt = convert(tx.amount, txCurrency);

        if (!unbudgetedMap[catId]) {
          unbudgetedMap[catId] = {
            id: catId,
            name: catName,
            amount: 0,
            count: 0,
            transactions: []
          };
        }
        unbudgetedMap[catId].amount += amt;
        unbudgetedMap[catId].count += 1;
        unbudgetedMap[catId].transactions.push({
          id: tx.id,
          description: tx.description,
          amount: amt,
          originalAmount: tx.amount,
          currency: txCurrency,
          date: tx.date,
          payee: tx.payee,
          source: tx.account?.name || tx.creditCard?.name || ''
        });
      }
    });

    // Sort transactions within each category by amount descending
    Object.values(unbudgetedMap).forEach(cat => {
      cat.transactions.sort((a, b) => b.amount - a.amount);
    });

    return Object.values(unbudgetedMap).sort((a, b) => b.amount - a.amount);
  }, [filteredTx, budgets, ratesData, t]);

  const UNBUDGETED_COLORS = ['#f59e0b','#d97706','#b45309','#92400e','#78350f','#fbbf24','#fcd34d','#fde68a','#a16207','#ca8a04'];

  // 3. Budgets vs Expenses
  const budgetData = budgets.map(b => {
    const catSpend = spendByCatId[b.categoryId] || 0;
    let multiplier = 1;
    if (!isMonthMode) {
      if (timeRange === '3M') multiplier = 3;
      if (timeRange === '6M') multiplier = 6;
      if (timeRange === '1Y' || timeRange === 'ALL') multiplier = 12;
    }
    const targetAmount = b.amount * multiplier;
    return {
      name:             b.category?.name || 'Unknown',
      budget:           targetAmount,
      spent:            catSpend,
      remaining:        targetAmount - catSpend,
    };
  }).sort((a, b) => b.budget - a.budget);

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleString(settings?.language || 'en-US', { month: 'long', year: 'numeric' });

  if (isLoading) return <div>Loading Analytics...</div>;

  const tooltipStyle = {
    contentStyle: { backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' },
    itemStyle:    { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    labelStyle:   { color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 lg:pb-8">

      {/* ── Header + Controls ── */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-serif text-white tracking-wide glow-text-white mb-1">{t('Analytics')}</h1>
            <p className="text-slate-400 font-serif italic text-sm">{t('Deep dive into your financial patterns')}</p>
          </div>

          {/* Range pills + Month toggle */}
          <div className="glass-card p-1 rounded-xl flex gap-1 border-white/5 bg-brand-900/40 relative overflow-hidden backdrop-blur-md overflow-x-auto no-scrollbar">
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent opacity-50 pointer-events-none" />
            {['1M', '3M', '6M', '1Y', 'ALL'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`relative z-10 px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 whitespace-nowrap ${
                  timeRange === range
                    ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-brand-800/50'
                }`}
              >
                {range}
              </button>
            ))}

            <div className="w-px bg-brand-600/40 mx-0.5 self-stretch" />

            <button
              onClick={() => {
                setTimeRange('MONTH');
                setViewMonth(now.getMonth());
                setViewYear(now.getFullYear());
              }}
              className={`relative z-10 px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 whitespace-nowrap ${
                isMonthMode
                  ? 'bg-emerald-500 text-brand-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-brand-800/50'
              }`}
            >
              {t('Month')}
            </button>
          </div>
        </div>

        {/* Month navigator — only visible in Month mode */}
        {isMonthMode && (
          <div className="flex items-center justify-center gap-3 animate-in fade-in duration-300">
            <button
              onClick={() => stepMonth(-1)}
              className="w-9 h-9 rounded-lg bg-brand-800/60 border border-brand-600/40 text-slate-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all flex items-center justify-center"
              title={t('Previous month')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="glass-card px-6 py-2 rounded-xl border-emerald-500/20 min-w-[220px] text-center">
              <p className="text-sm font-serif text-white tracking-wide capitalize">{monthLabel}</p>
            </div>

            <button
              onClick={() => stepMonth(1)}
              disabled={isNextDisabled}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                isNextDisabled
                  ? 'bg-brand-800/30 border-brand-600/20 text-slate-600 cursor-not-allowed'
                  : 'bg-brand-800/60 border-brand-600/40 text-slate-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10'
              }`}
              title={t('Next month')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Spending by Category */}
        <div className="glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none" />
          <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full" />
            {t('Spending by Category')}
          </h2>
          <div className="flex-1 min-h-0 relative z-10">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData} cx="50%" cy="50%"
                    innerRadius={90} outerRadius={130}
                    paddingAngle={5} dataKey="value" stroke="none"
                  >
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={v => <span className="text-white font-serif">{formatCurrency(v)}</span>}
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#cbd5e1', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex bg-brand-900/40 border border-brand-600/30 rounded-xl justify-center items-center h-full text-slate-400 font-serif italic shadow-inner">
                {t('No expense data in this period')}
              </div>
            )}
          </div>
        </div>

        {/* 2. Income vs Expenses */}
        <div className="glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            {t('Income vs Expenses')}
            {isMonthMode && <span className="text-xs text-emerald-400/70 font-sans tracking-widest ml-2 capitalize">{monthLabel}</span>}
          </h2>
          <div className="flex-1 min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={1}  />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={1}  />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={v => <span className="font-serif text-slate-100">{formatCurrency(v)}</span>}
                  {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }} />
                <Bar name={t('Income')}   dataKey="income"   fill="url(#incG)" radius={[4,4,0,0]} barSize={isMonthMode ? 40 : 16} />
                <Bar name={t('Expenses')} dataKey="expenses" fill="url(#expG)" radius={[4,4,0,0]} barSize={isMonthMode ? 40 : 16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Budgets vs Spends */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-amber-500 rounded-full" />
            {t('Budgets vs Spends')}
            <span className="text-sm text-slate-400 font-sans tracking-widest ml-2">
              ({isMonthMode ? monthLabel : timeRange})
            </span>
          </h2>
          <div className="flex-1 min-h-0 relative z-10">
            {budgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                  <defs>
                    <linearGradient id="budG" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%"  stopColor="#d4af37" stopOpacity={1}  />
                      <stop offset="95%" stopColor="#b49326" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="sptG" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={1}  />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.1)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }} width={120} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    formatter={v => <span className="font-serif text-slate-100">{formatCurrency(v)}</span>}
                    {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }} />
                  <Bar name={t('Budget')} dataKey="budget" fill="url(#budG)" radius={[0,4,4,0]} barSize={12} />
                  <Bar name={t('Spent')}  dataKey="spent"  fill="url(#sptG)" radius={[0,4,4,0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex bg-brand-900/40 border border-brand-600/30 rounded-xl justify-center items-center h-full text-slate-400 font-serif italic shadow-inner">
                {t('No active budgets found. Create one to see the comparison.')}
              </div>
            )}
          </div>
        </div>

        {/* 4. Savings per Month Chart */}
        {!isMonthMode && (
          <div className="glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
            <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              {t('Savings Rate')}
              <span className="text-sm text-slate-400 font-sans tracking-widest ml-2">
                ({t('MoM Savings %')})
              </span>
            </h2>
            <div className="flex-1 min-h-0 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="savG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[-100, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl space-y-2">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">{label}</p>
                            <p className="text-sm text-emerald-400 font-bold">{t('Savings Rate')}: {data.savingsRate}%</p>
                            <div className="text-xs text-slate-300 space-y-1 border-t border-white/5 pt-1">
                              <p>{t('Income')}: {formatCurrency(data.income)}</p>
                              <p>{t('Expenses')}: {formatCurrency(data.expenses)}</p>
                              <p className={`font-semibold ${data.absoluteSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t('Net Savings')}: {formatCurrency(data.absoluteSavings)}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="rgba(244,63,94,0.4)" strokeDasharray="3 3" />
                  <Area name={t('Savings Rate')} dataKey="savingsRate" stroke="#10b981" strokeWidth={2} fill="url(#savG)" type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 5. Total Cash at End of Month Chart */}
        {!isMonthMode && (
          <div className="glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none" />
            <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
              <div className="w-1 h-5 bg-gold-500 rounded-full" />
              {t('Liquid Cash Balance')}
              <span className="text-sm text-slate-400 font-sans tracking-widest ml-2">
                ({t('End of Month')})
              </span>
            </h2>
            <div className="flex-1 min-h-0 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cshG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    formatter={v => <span className="font-serif text-slate-100">{formatCurrency(v)}</span>}
                  />
                  <Area name={t('Liquid Cash')} dataKey="liquidCash" stroke="#d4af37" strokeWidth={2} fill="url(#cshG)" type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Grid container for Top Largest Expenses & Unbudgeted Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Top Largest Expenses */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
          <h2 className="text-xl font-serif text-white mb-4 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-rose-500 rounded-full" />
            {t('Top Largest Expenses')}
            {isMonthMode && <span className="text-xs text-rose-400/60 font-sans tracking-widest ml-2 capitalize">{monthLabel}</span>}
          </h2>

          {topExpenses.length > 0 ? (
            <div className="divide-y divide-brand-800/50 relative z-10">
              {topExpenses.map((tx, idx) => (
                <div key={tx.id} className="py-3 md:py-4 flex justify-between items-center hover:bg-brand-900/40 transition-colors px-3 md:px-4 -mx-3 md:-mx-4 rounded-xl group">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-900/60 border border-brand-600/50 text-gold-400 flex justify-center items-center font-serif font-bold text-lg md:text-xl shadow-inner shrink-0 group-hover:bg-gold-500/10 transition-colors">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-200 text-base md:text-lg tracking-wide truncate group-hover:text-white transition-colors">{tx.description}</h3>
                      <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                        {tx.category?.name || 'Uncategorized'}
                        <span className="text-brand-600 mx-1 opacity-50">•</span>
                        {new Date(tx.date).toLocaleDateString(settings?.language || 'en-US')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl md:text-2xl font-serif text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-brand-900/40 border border-brand-600/30 rounded-xl p-8 text-center mt-4">
              <p className="text-slate-400 font-serif italic mb-2">{t('No expenses found for this time period.')}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('Try selecting a different time range')}</p>
            </div>
          )}
        </div>

        {/* Unbudgeted Spending */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          <h2 className="text-xl font-serif text-white mb-4 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-amber-500 rounded-full" />
            {t('Unbudgeted Spending')}
            {isMonthMode && <span className="text-xs text-amber-400/60 font-sans tracking-widest ml-2 capitalize">{monthLabel}</span>}
          </h2>
          <p className="text-slate-400 font-serif italic text-xs mb-6 relative z-10">
            {t('Categories with expenses but no set budget')}
          </p>

          {unbudgetedExpenses.length > 0 ? (
            <div className="relative z-10">
              <div className="divide-y divide-brand-800/50">
                {unbudgetedExpenses.map((exp, idx) => {
                  const isExpanded = expandedUnbudgeted[exp.id];
                  const chartData = exp.transactions.map(tx => ({
                    name: tx.description,
                    value: tx.amount,
                    pct: ((tx.amount / exp.amount) * 100).toFixed(1)
                  }));

                  return (
                    <div key={exp.id}>
                      {/* Category header row — clickable */}
                      <div
                        className="py-3 md:py-4 flex justify-between items-center hover:bg-brand-900/40 transition-colors px-3 md:px-4 -mx-3 md:-mx-4 rounded-xl cursor-pointer select-none group"
                        onClick={() => setExpandedUnbudgeted(prev => ({ ...prev, [exp.id]: !prev[exp.id] }))}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-900/60 border border-brand-600/50 text-amber-400 flex justify-center items-center font-serif font-bold text-lg md:text-xl shadow-inner group-hover:bg-amber-500/10 transition-colors">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-200 text-base md:text-lg tracking-wide truncate group-hover:text-white transition-colors">{exp.name}</h3>
                            <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                              {exp.count === 1 
                                ? t('transaction_singular', { count: exp.count }) 
                                : t('transaction_plural', { count: exp.count })
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xl md:text-2xl font-serif text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                            {formatCurrency(exp.amount)}
                          </p>
                          <svg
                            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expandable detail panel */}
                      <div
                        className="overflow-hidden transition-all duration-400 ease-in-out"
                        style={{
                          maxHeight: isExpanded ? `${Math.max(320, exp.transactions.length * 52 + 200)}px` : '0px',
                          opacity: isExpanded ? 1 : 0,
                        }}
                      >
                        <div className="pb-4 pt-2 px-2">
                          {/* Donut chart + legend */}
                          <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                            <div className="w-[140px] h-[140px] shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%" cy="50%"
                                    innerRadius={35} outerRadius={60}
                                    dataKey="value"
                                    strokeWidth={1}
                                    stroke="rgba(15,23,42,0.8)"
                                  >
                                    {chartData.map((_, i) => (
                                      <Cell key={i} fill={UNBUDGETED_COLORS[i % UNBUDGETED_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(v, name) => [formatCurrency(v), name]}
                                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '11px' }}
                                    itemStyle={{ color: '#e2e8f0', fontSize: '11px' }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            {/* Legend (top 5) */}
                            <div className="flex-1 min-w-0 space-y-1">
                              {chartData.slice(0, 5).map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: UNBUDGETED_COLORS[i % UNBUDGETED_COLORS.length] }} />
                                  <span className="text-slate-300 truncate flex-1">{d.name}</span>
                                  <span className="text-slate-400 font-mono shrink-0">{d.pct}%</span>
                                </div>
                              ))}
                              {chartData.length > 5 && (
                                <p className="text-[10px] text-slate-500 italic pl-4">+{chartData.length - 5} {t('more')}</p>
                              )}
                            </div>
                          </div>

                          {/* Transaction list */}
                          <div className="bg-brand-900/40 rounded-xl border border-brand-600/20 divide-y divide-brand-800/40 max-h-[220px] overflow-y-auto custom-scrollbar">
                            {exp.transactions.map((tx, tIdx) => (
                              <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-brand-800/30 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: UNBUDGETED_COLORS[tIdx % UNBUDGETED_COLORS.length] }} />
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-200 truncate">{tx.description}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">
                                      {new Date(tx.date).toLocaleDateString(settings?.language || 'en-US', { month: 'short', day: 'numeric' })}
                                      {tx.source && <><span className="text-brand-600 mx-1">•</span>{tx.source}</>}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 pl-3">
                                  <p className="text-sm font-serif text-amber-400">{formatCurrency(tx.amount)}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">{((tx.amount / exp.amount) * 100).toFixed(1)}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Total row */}
              <div className="mt-4 pt-4 border-t border-amber-500/20 flex justify-between items-center px-3 md:px-4 -mx-3 md:-mx-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex justify-center items-center shadow-inner">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base md:text-lg tracking-wide">{t('Total')}</h3>
                    <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest mt-0.5">
                      {(() => {
                        const totalCount = unbudgetedExpenses.reduce((sum, e) => sum + e.count, 0);
                        return totalCount === 1
                          ? t('transaction_singular', { count: totalCount })
                          : t('transaction_plural', { count: totalCount });
                      })()}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl md:text-2xl font-serif font-bold text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                    {formatCurrency(unbudgetedExpenses.reduce((sum, e) => sum + e.amount, 0))}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-brand-900/40 border border-brand-600/30 rounded-xl p-8 text-center mt-4 relative z-10 flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-300 font-serif italic mb-1 text-sm">{t('No unbudgeted spending in this period')}</p>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">{t('All spending categories are budgeted!')}</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
