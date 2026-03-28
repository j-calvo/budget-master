import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Analytics() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [ratesData, setRatesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6M');

  useEffect(() => {
    async function fetchData() {
      try {
        const [txRes, catRes, budgRes, rateRes] = await Promise.all([
          api.get('/transactions'),
          api.get('/categories'),
          api.get('/budgets'),
          api.get('/currencies/rates')
        ]);
        setTransactions(txRes.data);
        setCategories(catRes.data);
        setBudgets(budgRes.data);
        setRatesData(rateRes.data);
      } catch (err) {
        console.error('Failed to load analytics data', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(settings?.language || 'en-US', {
      style: 'currency',
      currency: settings?.defaultCurrency || 'USD'
    }).format(amount);
  };

  // Filter transactions by timeRange
  const now = new Date();
  const getStartDate = () => {
    const d = new Date();
    if (timeRange === '1M') d.setMonth(d.getMonth() - 1);
    if (timeRange === '3M') d.setMonth(d.getMonth() - 3);
    if (timeRange === '6M') d.setMonth(d.getMonth() - 6);
    if (timeRange === '1Y') d.setFullYear(d.getFullYear() - 1);
    if (timeRange === 'ALL') return new Date(0);
    return d;
  };
  
  const startDate = getStartDate();
  const filteredTx = transactions.filter(tx => new Date(tx.date) >= startDate);

  const expenses = filteredTx.filter(tx => tx.type === 'expense');

  // Helper to convert to preferred currency
  const convert = (amount, fromCode) => {
    if (!ratesData || !ratesData.rates || fromCode === ratesData.base) return amount;
    const rate = ratesData.rates[fromCode];
    if (rate) return amount / rate;
    return amount;
  };

  // 1. Spending by Category (Pie Chart)
  const spendByCat = {};
  const spendByCatId = {}; // Helpful for budget mapping
  expenses.forEach(tx => {
    const catName = tx.category?.name || 'Uncategorized';
    const catId = tx.category?.id || 'uncategorized';
    const convertedAmount = convert(tx.amount, tx.account?.currency || 'USD');
    spendByCat[catName] = (spendByCat[catName] || 0) + convertedAmount;
    spendByCatId[catId] = (spendByCatId[catId] || 0) + convertedAmount;
  });
  
  const categoryData = Object.entries(spendByCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#d4af37', '#10b981', '#0ea5e9', '#f43f5e', '#a855f7', '#14b8a6', '#f59e0b', '#6366f1', '#ec4899'];

  // 2. Income vs Expense Trend (Bar Chart)
  // Group by month
  const monthlyFlows = {};
  const monthList = [];
  
  // Create empty buckets for the required range
  const monthsToIterate = timeRange === '1M' ? 1 
    : timeRange === '3M' ? 3 
    : timeRange === '6M' ? 6 
    : timeRange === '1Y' ? 12 : 12; // default to 12 for ALL to avoid massive charts

  for(let i = monthsToIterate - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString(settings?.language || 'en-US', { month: 'short', year: '2-digit' });
    monthlyFlows[key] = { name: key, [t('Income')]: 0, [t('Expenses')]: 0 };
    monthList.push(key);
  }

  filteredTx.forEach(tx => {
    const tDate = new Date(tx.date);
    const key = tDate.toLocaleString(settings?.language || 'en-US', { month: 'short', year: '2-digit' });
    if (monthlyFlows[key]) {
      const convertedAmount = convert(tx.amount, tx.account?.currency || 'USD');
      if (tx.type === 'income') monthlyFlows[key][t('Income')] += convertedAmount;
      else monthlyFlows[key][t('Expenses')] += convertedAmount;
    }
  });

  const barData = Object.values(monthlyFlows);

  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // 3. Budgets vs Expenses (Bar Chart)
  // Map budgets with actual spend in the selected timeframe
  const budgetData = budgets.map(b => {
    const catName = b.category?.name || 'Unknown';
    const catSpend = spendByCatId[b.categoryId] || 0;
    
    // Budgets are monthly, so to compare apples-to-apples we either scale the budget or show monthly averages
    // For simplicity, we'll map the total spend in the filtered period against the monthly budget multiplied by months 
    // BUT the better approach is usually just showing raw Budget vs Total Spend if user filters to '1M'
    // Let's multiply the budget by the number of months in the `timeRange` filter, except for 'ALL'
    let multiplier = 1;
    if (timeRange === '3M') multiplier = 3;
    if (timeRange === '6M') multiplier = 6;
    if (timeRange === '1Y') multiplier = 12;
    // For 'ALL', it's arbitrary without strict start/end. We'll leave it as a 12x multiplier for lack of better bounds
    if (timeRange === 'ALL') multiplier = 12;

    const targetAmount = b.amount * multiplier;

    return {
      name: catName,
      [t('Budget')]: targetAmount,
      [t('Spent')]: catSpend,
      [t('Remaining')]: targetAmount - catSpend
    };
  }).sort((a, b) => b.Budget - a.Budget); // sort by largest budget

  if (isLoading) return <div>Loading Analytics...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-wide glow-text-white mb-1">{t('Analytics')}</h1>
          <p className="text-slate-400 font-serif italic text-sm">{t('Deep dive into your financial patterns')}</p>
        </div>
        
        <div className="glass-card p-1 rounded-xl flex gap-1 border-white/5 bg-brand-900/40 relative overflow-hidden backdrop-blur-md overflow-x-auto custom-scrollbar no-scrollbar">
          <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent opacity-50 pointer-events-none"></div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category Pie Chart */}
        <div className="glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none"></div>
          <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full"></div>
            {t('Spending by Category')}
          </h2>
          <div className="flex-1 min-h-0 relative z-10">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={130}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => <span className="text-white font-serif">{formatCurrency(value)}</span>}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#cbd5e1', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: "20px", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex bg-brand-900/40 border border-brand-600/30 rounded-xl justify-center items-center h-full text-slate-400 font-serif italic shadow-inner">
                {t('No expense data in this period')}
              </div>
            )}
          </div>
        </div>

        {/* Income vs Expenses Bar Chart */}
        <div className="glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
          <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
            {t('Income vs Expenses')}
          </h2>
          <div className="flex-1 min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-serif)'}} tickFormatter={(val) => `${val >= 1000 ? (val/1000)+'k' : val}`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                  formatter={(value) => <span className="font-serif text-slate-100">{formatCurrency(value)}</span>}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }} />
                <Bar dataKey={t('Income')} fill="url(#colorIncome)" radius={[4, 4, 0, 0]} barSize={16}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </Bar>
                <Bar dataKey={t('Expenses')} fill="url(#colorExpense)" radius={[4, 4, 0, 0]} barSize={16}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budgets vs Expenses Bar Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[450px] relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors pointer-events-none"></div>
          <h2 className="text-xl font-serif text-white mb-6 relative z-10 flex items-center gap-2">
            <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
            {t('Budgets vs Spends')} <span className="text-sm text-slate-400 font-sans tracking-widest ml-2">({timeRange})</span>
          </h2>
          <div className="flex-1 min-h-0 relative z-10">
            {budgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-serif)'}} tickFormatter={(val) => `${val >= 1000 ? (val/1000)+'k' : val}`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em'}} width={120} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                    formatter={(value) => <span className="font-serif text-slate-100">{formatCurrency(value)}</span>}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }} />
                  <Bar dataKey={t('Budget')} fill="url(#colorBudget)" radius={[0, 4, 4, 0]} barSize={12}>
                    <defs>
                      <linearGradient id="colorBudget" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#b49326" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                  <Bar dataKey={t('Spent')} fill="url(#colorSpent)" radius={[0, 4, 4, 0]} barSize={12}>
                    <defs>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex bg-brand-900/40 border border-brand-600/30 rounded-xl justify-center items-center h-full text-slate-400 font-serif italic shadow-inner">
                {t('No active budgets found. Create one to see the comparison.')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Largest Expenses Breakdown */}
      <div className="glass-card p-6 mt-6 relative overflow-hidden group">
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-colors pointer-events-none"></div>
        <h2 className="text-xl font-serif text-white mb-4 relative z-10 flex items-center gap-2">
          <div className="w-1 h-5 bg-rose-500 rounded-full"></div>
          {t('Top Largest Expenses')}
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
                      {tx.category?.name || 'Uncategorized'} <span className="text-brand-600 mx-1 opacity-50">•</span> {new Date(tx.date).toLocaleDateString(settings?.language || 'en-US')}
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

    </div>
  );
}
