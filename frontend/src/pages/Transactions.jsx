import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Download, Upload, Search, SlidersHorizontal, ArrowUpDown, X, ChevronDown, CheckCircle2, Clock, Globe } from 'lucide-react';
import AmountInput from '../components/AmountInput';
import InboxQueue from '../components/InboxQueue';
import { formatCurrency } from '../lib/currencyUtils';

const API_URL = '/transactions';
const ACCTS_URL = '/accounts';
const CATS_URL = '/categories';

export default function Transactions() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [transactions, setTransactions] = useState([]);

  // Timezone-safe date formatting helper
  const formatDateSafe = (dateStr, options = {}) => {
    if (!dateStr) return '';
    try {
      // Split the YYYY-MM-DD part and create a local date to avoid UTC shifts
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString(settings?.language || 'en-US', options);
    } catch {
      return new Date(dateStr).toLocaleDateString(settings?.language || 'en-US', options);
    }
  };
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [settlingTx, setSettlingTx] = useState(null);
  const [extraIvaModal, setExtraIvaModal] = useState(false);
  const [newTx, setNewTx] = useState({ 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    description: '', 
    sourceId: '', 
    categoryId: '', 
    type: 'expense' 
  });

  // Filter & Sort state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSource, setFilterSource] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterSettlement, setFilterSettlement] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [hasManuallySelectedMonth, setHasManuallySelectedMonth] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, accRes, catRes, ccRes, budRes] = await Promise.all([
        api.get(API_URL),
        api.get(ACCTS_URL),
        api.get(CATS_URL),
        api.get('/credit-cards'),
        api.get('/budgets').catch(() => ({ data: [] }))
      ]);
      setTransactions(txRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setCreditCards(ccRes.data);
      setBudgets(budRes.data);
      
      const outOfBudgetCat = catRes.data.find(c => c.name.toLowerCase() === 'out of budget') || catRes.data[0];
      
      if (accRes.data.length > 0) setNewTx(prev => ({ ...prev, sourceId: `account_${accRes.data[0].id}` }));
      else if (ccRes.data.length > 0) setNewTx(prev => ({ ...prev, sourceId: `card_${ccRes.data[0].id}` }));
      
      if (outOfBudgetCat) setNewTx(prev => ({ ...prev, categoryId: outOfBudgetCat.id }));
    } catch (err) {
      console.error(err);
    }
  };

  // Derive the set of budget-linked category IDs
  const budgetCategoryIds = useMemo(() => {
    return new Set(budgets.map(b => b.categoryId));
  }, [budgets]);

  // Derive sorted list of unique transaction months (YYYY-MM)
  const monthsList = useMemo(() => {
    if (!transactions.length) return [];
    const months = new Set();
    transactions.forEach(tx => {
      if (tx.date) {
        const [year, month] = tx.date.split('T')[0].split('-');
        if (year && month) {
          months.add(`${year}-${month}`);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Format YYYY-MM key into localized name (e.g. "May 2026")
  const formatMonthKey = (monthKey) => {
    if (monthKey === 'all') return t('All Time');
    try {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString(settings?.language || 'en-US', { month: 'short', year: 'numeric' });
    } catch {
      return monthKey;
    }
  };

  // Auto-select the latest month on initial data load
  useEffect(() => {
    if (monthsList.length > 0 && selectedMonth === 'all' && !hasManuallySelectedMonth) {
      setSelectedMonth(monthsList[0]);
    }
  }, [monthsList, selectedMonth, hasManuallySelectedMonth]);

  // Adjust selectedMonth if it disappears from the available months
  useEffect(() => {
    if (monthsList.length > 0 && selectedMonth !== 'all' && !monthsList.includes(selectedMonth)) {
      setSelectedMonth(monthsList[0]);
    }
  }, [monthsList, selectedMonth]);

  // Compute counts for each month dynamically based on active filters (excluding selectedMonth filter)
  const monthCounts = useMemo(() => {
    const counts = {};
    let baseFiltered = [...transactions];

    if (filterSource !== 'all') {
      if (filterSource.startsWith('account_')) {
        const accId = filterSource.replace('account_', '');
        baseFiltered = baseFiltered.filter(tx => tx.accountId === accId);
      } else if (filterSource.startsWith('card_')) {
        const cardId = filterSource.replace('card_', '');
        baseFiltered = baseFiltered.filter(tx => tx.creditCardId === cardId);
      }
    }

    if (filterCategory !== 'all') {
      baseFiltered = baseFiltered.filter(tx => tx.categoryId === filterCategory);
    }

    if (filterType !== 'all') {
      baseFiltered = baseFiltered.filter(tx => tx.type === filterType);
    }

    if (filterSettlement !== 'all') {
      baseFiltered = baseFiltered.filter(tx => (tx.settlementStatus || 'SETTLED') === filterSettlement);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      baseFiltered = baseFiltered.filter(tx =>
        tx.description.toLowerCase().includes(q) ||
        (tx.account?.name || '').toLowerCase().includes(q) ||
        (tx.creditCard?.name || '').toLowerCase().includes(q) ||
        (tx.category?.name || '').toLowerCase().includes(q)
      );
    }

    baseFiltered.forEach(tx => {
      if (tx.date) {
        const [year, month] = tx.date.split('T')[0].split('-');
        const key = `${year}-${month}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    counts['all'] = baseFiltered.length;
    return counts;
  }, [transactions, filterSource, filterCategory, filterType, filterSettlement, searchQuery]);

  // Build source options for filter dropdown
  const sourceOptions = useMemo(() => {
    const opts = [{ value: 'all', label: t('All Sources') }];
    if (accounts.length > 0) {
      opts.push({ value: '__accounts_divider__', label: `── ${t('Accounts')} ──`, disabled: true });
      accounts.forEach(acc => opts.push({ value: `account_${acc.id}`, label: acc.name }));
    }
    if (creditCards.length > 0) {
      opts.push({ value: '__cards_divider__', label: `── ${t('Credit Cards')} ──`, disabled: true });
      creditCards.forEach(cc => opts.push({ value: `card_${cc.id}`, label: cc.name }));
    }
    return opts;
  }, [accounts, creditCards, t]);

  // Build category options (grouped: budget categories first, then others)
  const categoryOptions = useMemo(() => {
    const opts = [{ value: 'all', label: t('All Categories') }];
    const budgetCats = categories.filter(c => budgetCategoryIds.has(c.id));
    const otherCats = categories.filter(c => !budgetCategoryIds.has(c.id));

    if (budgetCats.length > 0) {
      opts.push({ value: '__budget_divider__', label: `── ${t('Budget Categories')} ──`, disabled: true });
      budgetCats.forEach(c => opts.push({ value: c.id, label: c.name, color: c.color }));
    }
    if (otherCats.length > 0) {
      opts.push({ value: '__other_divider__', label: `── ${t('Other Categories')} ──`, disabled: true });
      otherCats.forEach(c => opts.push({ value: c.id, label: c.name, color: c.color }));
    }
    return opts;
  }, [categories, budgetCategoryIds, t]);

  // Filtered & sorted transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Source filter
    if (filterSource !== 'all') {
      if (filterSource.startsWith('account_')) {
        const accId = filterSource.replace('account_', '');
        filtered = filtered.filter(tx => tx.accountId === accId);
      } else if (filterSource.startsWith('card_')) {
        const cardId = filterSource.replace('card_', '');
        filtered = filtered.filter(tx => tx.creditCardId === cardId);
      }
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(tx => tx.categoryId === filterCategory);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    // Settlement filter
    if (filterSettlement !== 'all') {
      filtered = filtered.filter(tx => (tx.settlementStatus || 'SETTLED') === filterSettlement);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(q) ||
        (tx.account?.name || '').toLowerCase().includes(q) ||
        (tx.creditCard?.name || '').toLowerCase().includes(q) ||
        (tx.category?.name || '').toLowerCase().includes(q)
      );
    }

    // Month filter
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(tx => {
        if (!tx.date) return false;
        const [year, month] = tx.date.split('T')[0].split('-');
        return `${year}-${month}` === selectedMonth;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date) - new Date(b.date);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, filterSource, filterCategory, filterType, filterSettlement, searchQuery, sortField, sortDirection, selectedMonth]);

  const pendingSettlementCount = useMemo(() => {
    return transactions.filter(tx => tx.settlementStatus === 'PENDING_SETTLEMENT').length;
  }, [transactions]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterSource !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterType !== 'all') count++;
    if (filterSettlement !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [filterSource, filterCategory, filterType, filterSettlement, searchQuery]);

  const clearFilters = () => {
    setFilterSource('all');
    setFilterCategory('all');
    setFilterType('all');
    setFilterSettlement('all');
    setSearchQuery('');
    setSortField('date');
    setSortDirection('desc');
    setHasManuallySelectedMonth(false);
    if (monthsList.length > 0) {
      setSelectedMonth(monthsList[0]);
    } else {
      setSelectedMonth('all');
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    try {
      const isAccount = newTx.sourceId.startsWith('account_');
      const realSourceId = newTx.sourceId.replace(/^(account_|card_)/, '');

      const payload = {
        amount: parseFloat(newTx.amount) || 0,
        date: newTx.date,
        description: newTx.description,
        type: newTx.type,
        categoryId: newTx.categoryId,
        accountId: isAccount ? realSourceId : null,
        creditCardId: !isAccount ? realSourceId : null,
        extraIva: !editingTx && newTx.type === 'expense' ? extraIvaModal : false,
        ivaRate: 13
      };
      
      if (editingTx) {
        await api.put(`${API_URL}/${editingTx.id}`, payload);
      } else {
        await api.post(API_URL, payload);
      }

      setShowModal(false);
      setEditingTx(null);
      setExtraIvaModal(false);
      setNewTx(prev => ({ ...prev, amount: '', description: '', type: 'expense' }));
      fetchData();
    } catch (err) {
      console.error('Failed to create/edit tx', err);
    }
  };

  const handleEditClick = (tx) => {
    setEditingTx(tx);
    setExtraIvaModal(false);
    setNewTx({
      amount: tx.amount,
      date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
      description: tx.description,
      sourceId: tx.accountId ? `account_${tx.accountId}` : `card_${tx.creditCardId}`,
      categoryId: tx.categoryId,
      type: tx.type
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this transaction?'))) return;
    try {
      await api.delete(`${API_URL}/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete tx', err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`${API_URL}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Failed to export transactions', err);
      alert(t('Failed to export transactions.'));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (accounts.length === 0) {
      alert(t('Please create at least one Bank Account before importing transactions.'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`${API_URL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(t(response.data.message || 'Import successful'));
      fetchData();
    } catch (err) {
      console.error('Failed to import transactions', err);
      alert(t(err.response?.data?.error || 'Failed to import transactions.'));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const SortButton = ({ field, label }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1.5 transition-colors ${isActive ? 'text-gold-400' : 'text-slate-400 hover:text-slate-200'}`}
      >
        {label}
        <div className="flex flex-col -space-y-1">
          <ChevronDown
            size={10}
            className={`rotate-180 transition-colors ${isActive && sortDirection === 'asc' ? 'text-gold-400' : 'text-slate-600'}`}
          />
          <ChevronDown
            size={10}
            className={`transition-colors ${isActive && sortDirection === 'desc' ? 'text-gold-400' : 'text-slate-600'}`}
          />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">{t('Transactions')}</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">{t('Manage your income and expenses')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-glass px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Upload size={16} /> {t('Import')}
          </button>
          
          <button 
            onClick={handleExport}
            className="btn-glass px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Download size={16} /> {t('Export')}
          </button>

          {accounts.length > 0 || creditCards.length > 0 ? (
            <button onClick={() => {
              setEditingTx(null);
              const outOfBudgetCat = categories.find(c => c.name.toLowerCase() === 'out of budget') || categories[0];
              const defaultSource = accounts.length > 0 ? `account_${accounts[0].id}` : `card_${creditCards[0].id}`;
              setNewTx({ 
                amount: '', 
                date: new Date().toISOString().split('T')[0], 
                description: '', 
                sourceId: defaultSource, 
                categoryId: outOfBudgetCat?.id || '', 
                type: 'expense' 
              });
              setExtraIvaModal(false);
              setShowModal(true);
            }} className="btn-gold px-5 py-2 text-sm shadow-md ml-2 flex items-center gap-1">
              <span className="text-lg leading-none">+</span> {t('New')}
            </button>
          ) : (
            <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 ml-2 shadow-[0_0_10px_rgba(244,63,94,0.1)]">{t('Add an account or card first')}</p>
          )}
        </div>
      </div>

      <InboxQueue 
        onActionComplete={fetchData} 
        categories={categories} 
        accounts={accounts} 
        creditCards={creditCards} 
      />

      {/* ── Pending Settlement Alert Banner ── */}
      {pendingSettlementCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t('You have {{count}} foreign purchase(s) pending statement settlement.', { count: pendingSettlementCount })}
              </p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                {t('When your credit card statement arrives, reconcile the final dollar charge.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFilterSettlement(prev => prev === 'PENDING_SETTLEMENT' ? 'all' : 'PENDING_SETTLEMENT');
              if (selectedMonth !== 'all') setSelectedMonth('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 ${
              filterSettlement === 'PENDING_SETTLEMENT'
                ? 'bg-amber-500 text-brand-950 font-extrabold hover:bg-amber-400'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            <Clock size={13} />
            {filterSettlement === 'PENDING_SETTLEMENT' ? t('Show All') : t('Review Pending')}
          </button>
        </div>
      )}

      {/* ── Filter & Sort Bar ── */}
      <div className="glass-card overflow-hidden border-brand-600/30">
        {/* Toggle row */}
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('Search transactions...')}
              className="w-full pl-9 pr-3 py-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Active filter badge + clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-gold-400 bg-gold-500/10 border border-gold-500/20 px-3 py-1.5 rounded-full hover:bg-gold-500/20 transition-colors"
              >
                <span>{activeFilterCount} {t('active')}</span>
                <X size={12} />
              </button>
            )}

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass px-4 py-2 flex items-center gap-2 text-sm transition-all ${showFilters ? 'border-gold-500/40 text-gold-400' : ''}`}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">{t('Filters')}</span>
            </button>
          </div>
        </div>

        {/* Expandable filter panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="px-5 pb-4 pt-1 flex flex-wrap items-end gap-4 border-t border-brand-600/30">
            {/* Source filter */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{t('Source')}</label>
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="px-3 py-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all appearance-none cursor-pointer"
              >
                {sourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className={opt.disabled ? 'bg-brand-900 text-slate-500 font-serif italic text-xs' : 'bg-brand-800'}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Category / Budget filter */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{t('Budget / Category')}</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all appearance-none cursor-pointer"
              >
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className={opt.disabled ? 'bg-brand-900 text-slate-500 font-serif italic text-xs' : 'bg-brand-800'}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{t('Type')}</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-brand-800">{t('All Types')}</option>
                <option value="expense" className="bg-brand-800">{t('Expense')}</option>
                <option value="income" className="bg-brand-800">{t('Income')}</option>
              </select>
            </div>

            {/* Settlement filter */}
            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{t('Filter by Settlement')}</label>
              <select
                value={filterSettlement}
                onChange={e => setFilterSettlement(e.target.value)}
                className="px-3 py-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-brand-800">{t('All Settlement States')}</option>
                <option value="PENDING_SETTLEMENT" className="bg-brand-800">{t('Pending Settlement')}</option>
                <option value="SETTLED" className="bg-brand-800">{t('Settled')}</option>
              </select>
            </div>

            {/* Sort control */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{t('Sort By')}</label>
              <div className="flex items-center gap-1">
                <select
                  value={sortField}
                  onChange={e => setSortField(e.target.value)}
                  className="px-3 py-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all appearance-none cursor-pointer flex-1"
                >
                  <option value="date" className="bg-brand-800">{t('Date')}</option>
                  <option value="amount" className="bg-brand-800">{t('Amount')}</option>
                </select>
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-brand-900/50 border border-brand-600/50 rounded-lg text-slate-400 hover:text-gold-400 transition-colors shrink-0"
                  title={sortDirection === 'asc' ? t('Ascending') : t('Descending')}
                >
                  <ArrowUpDown size={15} className={`transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Month Selector Slider ── */}
      {monthsList.length > 0 && (
        <div className="glass-card p-3 border-brand-600/30">
          <div className="flex gap-2 overflow-x-auto pb-1.5 snap-x">
            <button
              onClick={() => {
                setSelectedMonth('all');
                setHasManuallySelectedMonth(true);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all whitespace-nowrap snap-start flex items-center gap-2 cursor-pointer
                ${selectedMonth === 'all'
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                  : 'bg-brand-900/40 text-slate-400 hover:text-slate-200 border border-brand-600/30 hover:bg-brand-600/30'}`}
            >
              {t('All Time')}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedMonth === 'all' ? 'bg-gold-500/30 text-gold-300' : 'bg-brand-900/80 text-slate-500'}`}>
                {monthCounts['all'] || 0}
              </span>
            </button>
            
            {monthsList.map(monthKey => {
              const count = monthCounts[monthKey] || 0;
              const isSelected = selectedMonth === monthKey;
              return (
                <button
                  key={monthKey}
                  onClick={() => {
                    setSelectedMonth(monthKey);
                    setHasManuallySelectedMonth(true);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all whitespace-nowrap snap-start flex items-center gap-2 cursor-pointer
                    ${isSelected
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                      : count === 0
                        ? 'bg-brand-900/10 text-slate-600 border border-brand-600/10 opacity-50'
                        : 'bg-brand-900/40 text-slate-400 hover:text-slate-200 border border-brand-600/30 hover:bg-brand-600/30'}`}
                >
                  {formatMonthKey(monthKey)}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-gold-500/30 text-gold-300' : 'bg-brand-900/80 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Results summary ── */}
      {(activeFilterCount > 0 || searchQuery.trim() || selectedMonth !== 'all') && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <span>
            {t('Showing {{count}} of {{total}} transactions', {
              count: filteredTransactions.length,
              total: transactions.length
            })}
          </span>
        </div>
      )}

      {/* ── Transactions table ── */}
      <div className="glass-card overflow-hidden">
        <div>
          <div className="hidden md:grid p-4 border-b border-brand-600/50 bg-brand-900/40 text-xs font-semibold uppercase tracking-wider text-slate-400 grid-cols-6 gap-4">
            <div className="col-span-2">{t('Description')}</div>
            <div>{t('Category')}</div>
            <div>
              <SortButton field="date" label={t('Date')} />
            </div>
            <div className="text-right">
              <SortButton field="amount" label={t('Amount')} />
            </div>
            <div className="text-right">{t('Actions')}</div>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <div className="p-16 text-center">
              {transactions.length === 0 ? (
                <p className="text-slate-400 italic font-serif">{t('No transactions found.')}</p>
              ) : selectedMonth !== 'all' && monthCounts['all'] > 0 ? (
                <div>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-600/20 flex items-center justify-center text-slate-500">
                    <Search size={24} />
                  </div>
                  <p className="text-slate-400 font-serif italic text-lg mb-2">{t('No matches found in this month')}</p>
                  <p className="text-sm text-slate-500 mb-4">
                    {t('We found {{count}} matching transactions in other months.', { count: monthCounts['all'] })}
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedMonth('all');
                        setHasManuallySelectedMonth(true);
                      }}
                      className="btn-gold px-5 py-2 text-sm"
                    >
                      {t('Search All Time')}
                    </button>
                    <button
                      onClick={clearFilters}
                      className="btn-glass px-5 py-2 text-sm"
                    >
                      {t('Clear Filters')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-600/20 flex items-center justify-center text-slate-500">
                    <Search size={24} />
                  </div>
                  <p className="text-slate-400 font-serif italic text-lg mb-2">{t('No matching transactions')}</p>
                  <p className="text-sm text-slate-500 mb-4">{t('Try adjusting your filters or search query')}</p>
                  <button
                    onClick={clearFilters}
                    className="btn-glass px-5 py-2 text-sm"
                  >
                    {t('Clear Filters')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-brand-600/30">
              {filteredTransactions.map(tx => (
                <div key={tx.id} className="p-4 md:py-3 flex flex-col md:grid md:grid-cols-6 md:gap-4 items-start md:items-center hover:bg-brand-600/20 transition-colors group">
                  {/* ════ MOBILE LAYOUT ════ */}
                  <div className="w-full md:hidden space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif italic text-lg shadow-inner shrink-0
                          ${tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'}`}>
                          {tx.description.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 line-clamp-1">{tx.description}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.account?.name || tx.creditCard?.name}</span>
                            {tx.settlementStatus === 'PENDING_SETTLEMENT' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <Clock size={10} /> {t('Est.')} {tx.originalCurrency} {tx.originalAmount}
                              </span>
                            )}
                            {tx.settlementStatus === 'SETTLED' && tx.originalCurrency && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                ({tx.originalCurrency} {tx.originalAmount})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-serif tracking-wide text-lg ${tx.type === 'expense' ? 'text-slate-100' : 'text-gold-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]'}`}>
                          {tx.type === 'expense' ? '-' : '+'}
                          {formatCurrency(tx.amount, tx.account?.currency || tx.creditCard?.currency || settings?.defaultCurrency || 'USD', currencies, settings?.language)}
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-mono">
                          {formatDateSafe(tx.date, { month: 'short', day: 'numeric', year: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-brand-600/20">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-900/50 border border-brand-600/40 text-slate-300 rounded text-[10px] font-medium tracking-wide">
                        <div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: tx.category?.color || '#64748b' }}></div>
                        {tx.category?.name || 'Uncategorized'}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        {tx.settlementStatus === 'PENDING_SETTLEMENT' && (
                          <button
                            onClick={() => setSettlingTx(tx)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm"
                            title={t('Settle Transaction')}
                          >
                            <CheckCircle2 size={13} />
                            <span>{t('Settle')}</span>
                          </button>
                        )}
                        <button onClick={() => handleEditClick(tx)} className="text-slate-400 hover:text-gold-400 p-1.5 transition-colors active:scale-90">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors active:scale-90">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ════ DESKTOP LAYOUT ════ */}
                  <div className="hidden md:flex items-center gap-3 col-span-2 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif italic text-lg shadow-inner shrink-0
                      ${tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'}`}>
                      {tx.description.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-200 truncate">{tx.description}</p>
                        {tx.settlementStatus === 'PENDING_SETTLEMENT' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1">
                            <Clock size={10} /> {t('Pending Settlement')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{tx.account?.name || tx.creditCard?.name}</span>
                        {tx.originalCurrency && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            • {tx.originalCurrency} {tx.originalAmount} {tx.exchangeRate ? `(@ ${tx.exchangeRate.toFixed(4)})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-900/50 border border-brand-600/40 text-slate-300 rounded text-xs font-medium tracking-wide">
                      <div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: tx.category?.color || '#64748b' }}></div>
                      {tx.category?.name || 'Uncategorized'}
                    </span>
                  </div>

                  <div className="hidden md:block text-sm text-slate-400 uppercase tracking-wide">
                    {formatDateSafe(tx.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <div className={`hidden md:block text-right font-serif tracking-wide text-lg ${tx.type === 'expense' ? 'text-slate-300' : 'text-gold-400 drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]'}`}>
                    {tx.type === 'expense' ? '-' : '+'}
                    {formatCurrency(tx.amount, tx.account?.currency || tx.creditCard?.currency || settings?.defaultCurrency || 'USD', currencies, settings?.language)}
                  </div>

                  <div className="hidden md:flex justify-end items-center gap-2">
                    {tx.settlementStatus === 'PENDING_SETTLEMENT' && (
                      <button
                        onClick={() => setSettlingTx(tx)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold transition-all shadow-sm"
                        title={t('Settle Transaction')}
                      >
                        <CheckCircle2 size={13} />
                        <span>{t('Settle')}</span>
                      </button>
                    )}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(tx)} className="text-slate-400 hover:text-gold-400 p-1 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-400 p-1 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {editingTx ? t('Edit Transaction') : t('Add Transaction')}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>
            
            <form onSubmit={handleCreateTx} className="space-y-5">
              <div className="flex bg-brand-900/60 p-1.5 rounded-lg border border-brand-600/50">
                <button type="button" onClick={() => setNewTx({...newTx, type: 'expense'})} className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${newTx.type === 'expense' ? 'bg-brand-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>{t('Expense')}</button>
                <button type="button" onClick={() => setNewTx({...newTx, type: 'income'})} className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${newTx.type === 'income' ? 'bg-gold-500/20 text-gold-400 shadow-md border border-gold-500/20' : 'text-slate-400 hover:text-slate-200'}`}>{t('Income')}</button>
              </div>

              {(() => {
                const isAcc = newTx.sourceId?.startsWith('account_');
                const srcId = newTx.sourceId?.replace(/^(account_|card_)/, '');
                const activeSrc = isAcc ? accounts.find(a => a.id === srcId) : creditCards.find(c => c.id === srcId);
                const code = activeSrc?.currency || settings?.defaultCurrency || 'USD';
                
                // 1. Try to find the symbol in our currencies list
                const currencyRecord = currencies.find(c => c.code === code);
                const sym = currencyRecord?.symbol || (new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: code }).formatToParts(0).find(p => p.type === 'currency')?.value || '$');

                return (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Amount')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">{sym}</span>
                      <AmountInput
                        required
                        value={newTx.amount}
                        onChange={e => setNewTx({...newTx, amount: e.target.value})}
                        className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Description')}</label>
                  <input required type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all" placeholder="e.g. Weekly Groceries" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Date')}</label>
                  <input 
                    required 
                    type="date" 
                    value={newTx.date} 
                    onChange={e => setNewTx({...newTx, date: e.target.value})} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Source')}</label>
                  <select value={newTx.sourceId} onChange={e => setNewTx({...newTx, sourceId: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                    {accounts.length > 0 && (
                      <optgroup label={t("Accounts")} className="bg-brand-900 font-serif italic text-gold-400">
                        {accounts.map(acc => <option key={`acc_${acc.id}`} value={`account_${acc.id}`} className="bg-brand-800 text-white font-sans not-italic">{acc.name}</option>)}
                      </optgroup>
                    )}
                    {creditCards.length > 0 && (
                      <optgroup label={t("Credit Cards")} className="bg-brand-900 font-serif italic text-gold-400">
                        {creditCards.map(cc => <option key={`cc_${cc.id}`} value={`card_${cc.id}`} className="bg-brand-800 text-white font-sans not-italic">{cc.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Budget / Category')}</label>
                  <select value={newTx.categoryId} onChange={e => setNewTx({...newTx, categoryId: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                    {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-brand-800">{cat.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Extra IVA 13% option for new expenses */}
              {!editingTx && newTx.type === 'expense' && (
                <div className="pt-2 border-t border-brand-600/20">
                  <label className="flex items-center justify-between cursor-pointer group select-none">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={extraIvaModal}
                        onChange={e => setExtraIvaModal(e.target.checked)}
                        className="w-4 h-4 rounded border-brand-500 bg-brand-900 text-gold-500 focus:ring-0 cursor-pointer accent-gold-500"
                      />
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors font-medium">
                        {t('Extra IVA (13%)')}
                      </span>
                    </div>
                    {extraIvaModal && newTx.amount && !isNaN(parseFloat(newTx.amount)) && (
                      <span className="text-xs font-serif text-gold-400 font-bold">
                        +{(parseFloat(newTx.amount) * 0.13).toFixed(2)}
                      </span>
                    )}
                  </label>
                  {extraIvaModal && (
                    <p className="text-[11px] text-slate-400 mt-1 pl-6">
                      {t('Will save 2 transactions: purchase and 13% IVA.')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => { setShowModal(false); setEditingTx(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-6 py-2 text-sm">{editingTx ? t('Save Changes') : t('Save Transaction')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settle Transaction Modal ── */}
      {settlingTx && (
        <SettleModal
          tx={settlingTx}
          onClose={() => setSettlingTx(null)}
          onSettled={fetchData}
          currencies={currencies}
          language={settings?.language}
        />
      )}
    </div>
  );
}

function SettleModal({ tx, onClose, onSettled, currencies, language }) {
  const { t } = useTranslation();
  const [settledAmount, setSettledAmount] = useState(tx.amount?.toString() || '');
  const [settledDate, setSettledDate] = useState(
    tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetCurrency = tx.account?.currency || tx.creditCard?.currency || 'USD';
  const originalCurrency = tx.originalCurrency || 'EUR';
  const originalAmount = tx.originalAmount || tx.amount;

  const numericSettled = parseFloat(settledAmount) || 0;
  const delta = numericSettled - tx.amount;
  const effectiveRate = originalAmount > 0 && numericSettled > 0 ? (numericSettled / originalAmount) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numericSettled <= 0) {
      setError(t('Please enter a valid amount'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/transactions/${tx.id}/settle`, {
        settledAmount: numericSettled,
        settledDate
      });
      onSettled();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || t('Failed to settle transaction'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="glass-card p-6 sm:p-8 w-full max-w-lg shadow-2xl border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-serif text-white tracking-wide flex items-center gap-2">
              <CheckCircle2 size={22} className="text-amber-400" />
              {t('Settle Transaction')}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t('Enter the final billed amount as shown on your bank statement.')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 transition-colors rounded-lg hover:bg-brand-600/30"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Voucher and card details summary */}
        <div className="mb-6 p-4 bg-brand-950/60 border border-brand-600/30 rounded-xl space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('Description')}:</span>
            <span className="text-white font-medium truncate max-w-[240px]">{tx.description}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('Account')}:</span>
            <span className="text-gold-400 font-medium">
              {tx.account?.name || tx.creditCard?.name} ({targetCurrency})
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-brand-600/30">
            <span className="text-slate-400">{t('Original Purchase')}:</span>
            <span className="font-serif text-white font-bold text-sm">
              {originalCurrency} {originalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('Estimated Amount')}:</span>
            <span className="font-serif text-amber-300 font-semibold">
              {formatCurrency(tx.amount, targetCurrency, currencies, language)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              {t('Final Statement Amount')} ({targetCurrency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={settledAmount}
                onChange={e => setSettledAmount(e.target.value)}
                className="input-glass w-full text-lg font-mono font-bold text-white pr-16"
                placeholder="0.00"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gold-400/80">
                {targetCurrency}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              {t('Statement / Posting Date')}
            </label>
            <input
              type="date"
              value={settledDate}
              onChange={e => setSettledDate(e.target.value)}
              className="input-glass w-full text-xs text-white"
            />
          </div>

          {/* Dynamic adjustment calculation */}
          <div className="p-3 bg-brand-900/40 border border-brand-600/40 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{t('Difference / Balance Adjustment')}:</span>
              <span className={`font-mono font-bold ${delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} {targetCurrency}
              </span>
            </div>
            {effectiveRate && (
              <div className="flex justify-between items-center pt-1 border-t border-brand-600/20 text-[11px]">
                <span className="text-slate-500">{t('Effective Rate')}:</span>
                <span className="font-mono text-slate-300">
                  1 {originalCurrency} = {effectiveRate.toFixed(4)} {targetCurrency}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-brand-600/30">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-glass px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold px-5 py-2 text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5"
            >
              {loading ? (
                <span>{t('Settling...')}</span>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{t('Settle & Reconcile')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
