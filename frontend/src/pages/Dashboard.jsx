import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import FinancialTimeline from '../components/FinancialTimeline';
import { formatCurrency } from '../lib/currencyUtils';

export default function Dashboard() {
  const { settings, currencies, isLoading: settingsLoading } = useSettings();
  const { t } = useTranslation();
  
  const [loadingDb, setLoadingDb] = useState(true);
  const [metrics, setMetrics] = useState({
    netWorth: 0,
    income: 0,
    expenses: 0,
    savingsRate: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [loans, setLoans] = useState([]);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [accRes, txRes, ccRes, loanRes, rateRes, budgRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/transactions'),
          api.get('/credit-cards'),
          api.get('/loans'),
          api.get('/currencies/rates'),
          api.get('/budgets'),
        ]);

        const accounts = accRes.data;
        const transactions = txRes.data;
        const cards = ccRes.data;
        const loans = loanRes.data;
        const { rates, base: prefBase } = rateRes.data;
        const budgetsData = budgRes.data;

        // Helper to convert to preferred currency
        const convert = (amount, fromCode) => {
          if (!rates || fromCode === prefBase) return amount;
          // If rates are for 'USD' but prefBase is 'CRC', we might need cross-conversion 
          // but our backend already returns rates relative to prefBase.
          const rate = rates[fromCode]; 
          if (rate) return amount / rate; // If rates[fromCode] is 515 (CRC per 1 USD) and amount is 515, result is 1 USD.
          return amount;
        };

        // 1. Net Worth = Accounts (Assets) - Cards (Liabilities) - Loans (Liabilities)
        const totalAssets = accounts
          .filter(a => a.isLiquid !== false) // Default to true if undefined
          .reduce((sum, a) => sum + convert(a.balance || 0, a.currency || 'USD'), 0);
          
        const allAssets = accounts.reduce((sum, a) => sum + convert(a.balance || 0, a.currency || 'USD'), 0);
        const cardDebt = cards.reduce((sum, c) => sum + convert(c.balance || 0, c.currency || 'USD'), 0);
        const loanDebt = loans.reduce((sum, l) => sum + convert(l.balance || 0, l.currency || 'USD'), 0);
        const netWorth = allAssets - cardDebt - loanDebt;

        // 2. This Month's Income & Expenses
        const now = new Date();
        const budgetStartDay = settings?.budgetStartDay || 1;
        let startOfPeriod;
        
        if (budgetStartDay === 1) {
          startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          // If today is Mar 10 and startDay is 18, we are in the "Feb 18 - Mar 17" period.
          // If today is Mar 20 and startDay is 18, we are in the "Mar 18 - Apr 17" period.
          if (now.getDate() < budgetStartDay) {
            startOfPeriod = new Date(now.getFullYear(), now.getMonth() - 1, budgetStartDay);
          } else {
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), budgetStartDay);
          }
        }
        
        let mIncome = 0;
        let mExpenses = 0;

        transactions.forEach(tx => {
          const tDate = new Date(tx.date);
          if (tDate >= startOfPeriod) {
            const txCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
            const convertedAmount = convert(tx.amount, txCurrency);
            if (tx.type === 'income') mIncome += convertedAmount;
            else if (tx.type === 'expense') mExpenses += convertedAmount;
          }
        });

        // 3. Savings Rate = (Income - Expenses) / Income * 100
        const savingsRate = mIncome > 0 ? Math.max(0, ((mIncome - mExpenses) / mIncome) * 100).toFixed(1) : 0;

        // 4. Chart Data (Group last 6 months)
        const monthlyFlows = {};
        for(let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString(settings?.language || 'en-US', { month: 'short' });
          monthlyFlows[key] = { name: key, income: 0, expenses: 0 };
        }

        transactions.forEach(tx => {
          const tDate = new Date(tx.date);
          const diffMonths = (now.getFullYear() - tDate.getFullYear()) * 12 + (now.getMonth() - tDate.getMonth());
          if (diffMonths >= 0 && diffMonths <= 5) {
            const key = tDate.toLocaleString(settings?.language || 'en-US', { month: 'short' });
            if (monthlyFlows[key]) {
              const txCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
              const convertedAmount = convert(tx.amount, txCurrency);
              if (tx.type === 'income') monthlyFlows[key].income += convertedAmount;
              else if (tx.type === 'expense') monthlyFlows[key].expenses += convertedAmount;
            }
          }
        });

        setMetrics({ totalAssets, netWorth, income: mIncome, expenses: mExpenses, savingsRate });
        setChartData(Object.values(monthlyFlows));
        
        // 5. Recent 5 Transactions
        const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecentTransactions(sortedTx.slice(0, 5));

        // 6. Store cards/loans for timeline
        setCards(cards);
        setLoans(loans);
        setBudgets(budgetsData);

      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoadingDb(false);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (settingsLoading || loadingDb) return (
    <div className="flex justify-center items-center h-64 text-slate-400 font-medium">
      Loading dashboard...
    </div>
  );

  const displayCurrency = (amount, code) => {
    return formatCurrency(amount, code || settings?.defaultCurrency || 'USD', currencies, settings?.language);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-4 rounded-xl shadow-2xl shadow-black/50 border border-brand-600/50">
          <p className="text-gold-400 font-serif italic mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium flex justify-between gap-6" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span>{displayCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Financial Timeline */}
      <FinancialTimeline 
        cards={cards} 
        loans={loans} 
        settings={settings} 
        metrics={metrics}
        budgets={budgets}
      />

      {/* KPI Grid - Row 1: Balance Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Total Cash */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">{t('Total Cash')}</p>
          <p className="text-xl md:text-3xl font-light font-serif text-white mt-2 md:mt-3 tracking-wide">
            {displayCurrency(metrics.totalAssets)}
          </p>
        </div>
        {/* Net Worth */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-gold-500/30 hover:shadow-gold-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-gold-400 transition-colors">{t('Net Worth')}</p>
          <p className="text-xl md:text-3xl font-light font-serif mt-2 md:mt-3 tracking-wide text-white">
            {displayCurrency(metrics.netWorth)}
          </p>
        </div>
      </div>

      {/* KPI Grid - Row 2: Cash Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Total Income */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
            {t('Monthly Income')} 
            {budgets.length > 0 && budgets[0].month && (
              <span className="opacity-60 ml-1">({new Date(2000, budgets[0].month - 1).toLocaleString(settings?.language || 'en-US', { month: 'short' })})</span>
            )}
          </p>
          <p className="text-xl md:text-3xl font-light font-serif text-emerald-400 mt-2 md:mt-3 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] tracking-wide">
            +{displayCurrency(metrics.income)}
          </p>
        </div>
        {/* Total Expenses */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-rose-500/30 hover:shadow-rose-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-rose-400 transition-colors">
            {t('Monthly Expenses')}
            {budgets.length > 0 && budgets[0].month && (
              <span className="opacity-60 ml-1">({new Date(2000, budgets[0].month - 1).toLocaleString(settings?.language || 'en-US', { month: 'short' })})</span>
            )}
          </p>
          <p className="text-xl md:text-3xl font-light font-serif text-rose-400 mt-2 md:mt-3 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)] tracking-wide">
            -{displayCurrency(metrics.expenses)}
          </p>
        </div>
        {/* Savings */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-gold-500/30 hover:shadow-gold-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-gold-400 transition-colors">{t('Savings Rate')}</p>
          <p className="text-xl md:text-3xl font-light font-serif text-gold-400 mt-2 md:mt-3 drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] tracking-wide">
            {metrics.savingsRate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-6 min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
          
          <h2 className="text-lg font-serif italic text-white mb-8 tracking-wide flex items-center gap-3">
            <span className="w-8 h-[1px] bg-gold-500/50 block"></span>
            {t('Cash Flow')} 
            {budgets.length > 0 && budgets[0].month && (
              <span className="text-gold-500/50 ml-1">
                — {new Date(2000, budgets[0].month - 1).toLocaleString(settings?.language || 'en-US', { month: 'long' })}
              </span>
            )}
          </h2>
          
          <div className="flex-1 h-[350px] -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C2641" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontFamily: 'inherit'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontFamily: 'inherit'}} tickFormatter={(value) => `${value >= 1000 ? (value/1000)+'k' : value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F3E5AB', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }} />
                <Area type="monotone" name={t('Income')} dataKey="income" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" activeDot={{ r: 6, fill: '#0A0F1C', stroke: '#D4AF37', strokeWidth: 2 }} />
                <Area type="monotone" name={t('Expenses')} dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" activeDot={{ r: 5, fill: '#0A0F1C', stroke: '#f43f5e', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Sidebar: Upcoming Obligations + Recent Activity */}
        <div className="flex flex-col gap-5">

          {/* ── Upcoming Obligations Radar ── */}
          {(() => {
            const today2 = new Date();
            const currentDay2 = today2.getDate();
            const WINDOW = 7; // days to look forward
            const obligations = [];

            // Credit Cards: due within 7 days (balance > 0)
            cards.forEach(card => {
              if (!card.dueDate || card.balance <= 0) return;
              const diff = card.dueDate - currentDay2;
              obligations.push({
                key: `cc-${card.id}`,
                label: card.name,
                diff,
                type: 'card',
                amount: card.balance,
                currency: card.currency,
              });
            });

            // Loans: due this month within 7 days
            loans.forEach(loan => {
              if (!loan.nextDueDate) return;
              const dueDate = new Date(loan.nextDueDate);
              if (dueDate.getMonth() !== today2.getMonth() || dueDate.getFullYear() !== today2.getFullYear()) return;
              const diff = dueDate.getDate() - currentDay2;
              obligations.push({
                key: `loan-${loan.id}`,
                label: loan.name,
                diff,
                type: 'loan',
                amount: loan.monthlyPayment,
                currency: loan.currency,
              });
            });

            // Budgets: payDay within window, not fully paid
            budgets.forEach(budget => {
              if (!budget.payDay) return;
              const spent = parseFloat(budget.spent) || 0;
              const amount = parseFloat(budget.amount) || 0;
              if (spent >= amount && amount > 0) return; // already paid
              const diff = budget.payDay - currentDay2;
              obligations.push({
                key: `bud-${budget.id}`,
                label: budget.category?.name || 'Budget',
                diff,
                type: 'budget',
                amount: budget.amount,
                currency: budget.currency,
              });
            });

            // Filter to window + overdue, sort by urgency (overdue first, then soonest)
            const filtered = obligations
              .filter(o => o.diff <= WINDOW)
              .sort((a, b) => a.diff - b.diff);

            const typeIcon = (type) => {
              if (type === 'card') return (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              );
              if (type === 'loan') return (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              );
              return (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              );
            };

            const diffLabel = (diff) => {
              if (diff < 0) return { text: t('Overdue by {{days}} days', { days: Math.abs(diff) }), cls: 'bg-rose-500/15 text-rose-400 border-rose-500/20' };
              if (diff === 0) return { text: t('Due today'), cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
              if (diff === 1) return { text: t('Due in {{days}} day', { days: 1 }), cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
              return { text: t('Due in {{days}} days', { days: diff }), cls: 'bg-slate-500/15 text-slate-400 border-slate-500/20' };
            };

            return (
              <div className="glass-card p-5 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-10 mix-blend-screen" />
                <h2 className="text-base font-serif italic text-white mb-4 tracking-wide border-b border-brand-600/40 pb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {t('Upcoming Obligations')}
                </h2>
                {filtered.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-sm text-emerald-400 font-medium">{t('Nothing due this week')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('All clear')}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map(ob => {
                      const { text, cls } = diffLabel(ob.diff);
                      return (
                        <div key={ob.key} className="flex items-center justify-between gap-3 group p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-brand-800/60 border border-brand-600/40 flex items-center justify-center text-slate-400 shrink-0">
                              {typeIcon(ob.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">{ob.label}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{displayCurrency(ob.amount, ob.currency)}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-md border ${cls}`}>
                            {text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Recent Transactions ── */}
          <div className="glass-card p-5 md:p-6 flex flex-col relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-600/20 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-lg font-serif italic text-white mb-6 tracking-wide border-b border-brand-600/40 pb-4">
              {t('Recent Activity')}
            </h2>
            
            {recentTransactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm italic font-serif opacity-70">
                {t('No recent transactions')}
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {recentTransactions.map(tx => {
                  const isExpense = tx.type === 'expense';
                  return (
                    <div key={tx.id} className="flex justify-between items-start gap-3 group cursor-default">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-serif italic text-base md:text-lg shadow-inner shrink-0
                          ${isExpense ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'}`}>
                          {tx.description.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-200 text-sm truncate group-hover:text-white transition-colors">{tx.description}</p>
                          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 tracking-wide uppercase truncate">
                            {new Date(tx.date).toLocaleDateString(settings?.language || 'en-US', { month: 'short', day: 'numeric' })}
                            <span className="mx-1 opacity-30">•</span>
                            {tx.account?.name || tx.creditCard?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-serif text-sm md:text-base tracking-wide ${isExpense ? 'text-slate-300' : 'text-gold-400 drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]'}`}>
                          {isExpense ? '-' : '+'}{displayCurrency(tx.amount, tx.account?.currency || tx.creditCard?.currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
