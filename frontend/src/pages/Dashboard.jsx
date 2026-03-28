import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import FinancialTimeline from '../components/FinancialTimeline';

export default function Dashboard() {
  const { settings, isLoading: settingsLoading } = useSettings();
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
        const assets = accounts.reduce((sum, a) => sum + convert(a.balance || 0, a.currency || 'USD'), 0);
        const cardDebt = cards.reduce((sum, c) => sum + convert(c.balance || 0, c.currency || 'USD'), 0);
        const loanDebt = loans.reduce((sum, l) => sum + convert(l.balance || 0, l.currency || 'USD'), 0);
        const netWorth = assets - cardDebt - loanDebt;

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
            const convertedAmount = convert(tx.amount, tx.account?.currency || 'USD');
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
          monthlyFlows[key] = { name: key, [t('Income')]: 0, [t('Expenses')]: 0 };
        }

        transactions.forEach(tx => {
          const tDate = new Date(tx.date);
          const diffMonths = (now.getFullYear() - tDate.getFullYear()) * 12 + (now.getMonth() - tDate.getMonth());
          if (diffMonths >= 0 && diffMonths <= 5) {
            const key = tDate.toLocaleString(settings?.language || 'en-US', { month: 'short' });
            if (monthlyFlows[key]) {
              const convertedAmount = convert(tx.amount, tx.account?.currency || 'USD');
              if (tx.type === 'income') monthlyFlows[key][t('Income')] += convertedAmount;
              else monthlyFlows[key][t('Expenses')] += convertedAmount;
            }
          }
        });

        setMetrics({ netWorth, income: mIncome, expenses: mExpenses, savingsRate });
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(settings?.language || 'en-US', {
      style: 'currency',
      currency: settings?.defaultCurrency || 'USD'
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-4 rounded-xl shadow-2xl shadow-black/50 border border-brand-600/50">
          <p className="text-gold-400 font-serif italic mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium flex justify-between gap-6" style={{ color: entry.color }}>
              <span>{t(entry.name)}:</span>
              <span>{formatCurrency(entry.value)}</span>
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

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Net Worth */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-gold-500/30 hover:shadow-gold-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-gold-400 transition-colors">{t('Net Worth')}</p>
          <p className={`text-xl md:text-3xl font-light font-serif mt-2 md:mt-3 tracking-wide ${metrics.netWorth >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrency(metrics.netWorth)}
          </p>
        </div>
        {/* Total Income */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">{t('Monthly Income')}</p>
          <p className="text-xl md:text-3xl font-light font-serif text-emerald-400 mt-2 md:mt-3 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] tracking-wide">
            +{formatCurrency(metrics.income)}
          </p>
        </div>
        {/* Total Expenses */}
        <div className="glass-card p-4 md:p-6 transition-all hover:border-rose-500/30 hover:shadow-rose-500/10 group cursor-default">
          <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest group-hover:text-rose-400 transition-colors">{t('Monthly Expenses')}</p>
          <p className="text-xl md:text-3xl font-light font-serif text-rose-400 mt-2 md:mt-3 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)] tracking-wide">
            -{formatCurrency(metrics.expenses)}
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
            {t('Cash Flow (6 Months)')}
          </h2>
          
          <div className="flex-1 min-h-[300px] -ml-4">
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
                <Area type="monotone" dataKey={t('Income')} stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" activeDot={{ r: 6, fill: '#0A0F1C', stroke: '#D4AF37', strokeWidth: 2 }} />
                <Area type="monotone" dataKey={t('Expenses')} stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" activeDot={{ r: 5, fill: '#0A0F1C', stroke: '#f43f5e', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Recent Transactions */}
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
                        {isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
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
  );
}
