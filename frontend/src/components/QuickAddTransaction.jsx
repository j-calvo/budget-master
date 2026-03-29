import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AmountInput from './AmountInput';

export default function QuickAddTransaction() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    sourceId: '',
    categoryId: '',
    type: 'expense'
  });

  // Hide FAB on login/register pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  // Hide FAB on the Transactions page itself (it already has its own + button)
  const isTransactionsPage = location.pathname === '/transactions';

  const fetchFormData = useCallback(async () => {
    try {
      const [accRes, catRes, ccRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
        api.get('/credit-cards')
      ]);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setCreditCards(ccRes.data);

      const outOfBudgetCat = catRes.data.find(c => c.name.toLowerCase() === 'out of budget') || catRes.data[0];
      const defaultSource = accRes.data.length > 0 
        ? `account_${accRes.data[0].id}` 
        : ccRes.data.length > 0 ? `card_${ccRes.data[0].id}` : '';

      setFormData(prev => ({
        ...prev,
        sourceId: defaultSource,
        categoryId: outOfBudgetCat?.id || '',
        date: new Date().toISOString().split('T')[0]
      }));
    } catch (err) {
      console.error('Failed to load form data', err);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setSuccess(false);
    fetchFormData();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSuccess(false);
    setFormData(prev => ({ ...prev, amount: '', description: '', type: 'expense' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isAccount = formData.sourceId.startsWith('account_');
      const realSourceId = formData.sourceId.replace(/^(account_|card_)/, '');

      await api.post('/transactions', {
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        description: formData.description,
        type: formData.type,
        categoryId: formData.categoryId,
        accountId: isAccount ? realSourceId : null,
        creditCardId: !isAccount ? realSourceId : null
      });

      setSuccess(true);
      // Reset form for next entry
      setFormData(prev => ({ ...prev, amount: '', description: '' }));
      
      // Auto-close after brief success feedback
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to create transaction', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive currency symbol from selected source
  const getCurrencySymbol = () => {
    const isAcc = formData.sourceId?.startsWith('account_');
    const srcId = formData.sourceId?.replace(/^(account_|card_)/, '');
    const activeSrc = isAcc ? accounts.find(a => a.id === srcId) : creditCards.find(c => c.id === srcId);
    const code = activeSrc?.currency || settings?.defaultCurrency || 'USD';
    
    // 1. Try to find the symbol in our global currencies list
    const currencyRecord = currencies.find(c => c.code === code);
    if (currencyRecord?.symbol) return currencyRecord.symbol;

    // 2. Fallback to Intl.NumberFormat using the user's language
    const parts = new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: code }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value || '$';
  };

  const hasSource = accounts.length > 0 || creditCards.length > 0;

  if (isAuthPage || isTransactionsPage) return null;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        onClick={handleOpen}
        className="fixed z-50 group"
        style={{
          /* Mobile: above the bottom nav bar. Desktop: bottom-right corner */
          bottom: 'max(calc(6rem + 1.5rem + 12px), env(safe-area-inset-bottom, 0px) + 7.5rem)',
          right: '1.25rem',
        }}
        aria-label={t('Add Transaction')}
      >
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-gold-500/30 animate-ping opacity-40 group-hover:opacity-0 transition-opacity" />
        
        {/* Button */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-[0_8px_30px_rgba(212,175,55,0.4)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.6)] hover:scale-110 active:scale-95 transition-all duration-200">
          <Plus size={26} className="text-brand-900" strokeWidth={2.5} />
        </div>
      </button>

      {/* ── Desktop: also position normally ── */}
      <style>{`
        @media (min-width: 768px) {
          .fab-btn-position {
            bottom: 2rem !important;
            right: 2rem !important;
          }
        }
      `}</style>

      {/* ── Quick Add Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-brand-900/80 backdrop-blur-md" onClick={handleClose} />
          
          {/* Modal Sheet */}
          <div className="relative w-full sm:max-w-md sm:mx-4 glass-card shadow-2xl border-white/10 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl">
            {/* Gold accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full blur-3xl -z-10 mix-blend-screen" />

            {/* Success overlay */}
            {success && (
              <div className="absolute inset-0 z-20 bg-brand-900/90 flex flex-col items-center justify-center animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-serif text-xl text-white tracking-wide">{t('Transaction saved!')}</p>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div>
                <h2 className="text-xl font-serif text-white tracking-wide">{t('Quick Add')}</h2>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mt-0.5">{t('New Transaction')}</p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            {!hasSource ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">{t('Add an account or card first')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">
                {/* Type toggle */}
                <div className="flex bg-brand-900/60 p-1 rounded-lg border border-brand-600/50">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'expense'})} 
                    className={`flex-1 py-2 rounded text-sm font-medium transition-all ${formData.type === 'expense' ? 'bg-brand-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {t('Expense')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'income'})} 
                    className={`flex-1 py-2 rounded text-sm font-medium transition-all ${formData.type === 'income' ? 'bg-gold-500/20 text-gold-400 shadow-md border border-gold-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {t('Income')}
                  </button>
                </div>

                {/* Amount — large & prominent */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-[0.15em]">{t('Amount')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-serif text-lg">{getCurrencySymbol()}</span>
                    <AmountInput
                      required
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-brand-900/50 border border-brand-600/50 rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white text-2xl font-serif transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-[0.15em]">{t('Description')}</label>
                  <input
                    required
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all text-sm"
                    placeholder={t('e.g. Weekly Groceries')}
                  />
                </div>

                {/* Source + Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-[0.15em]">{t('Source')}</label>
                    <select
                      value={formData.sourceId}
                      onChange={e => setFormData({...formData, sourceId: e.target.value})}
                      className="w-full px-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer text-sm"
                    >
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
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-[0.15em]">{t('Category')}</label>
                    <select
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full px-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer text-sm"
                    >
                      {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-brand-800">{cat.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-[0.15em]">{t('Date')}</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-xl focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 text-sm text-slate-400 hover:text-white transition-colors rounded-xl border border-brand-600/30 hover:border-brand-600/60"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 btn-gold px-4 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('Saving...') : t('Save Transaction')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
