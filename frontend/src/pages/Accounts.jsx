import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import AmountInput from '../components/AmountInput';
import { formatCurrency } from '../lib/currencyUtils';

const API_URL = '/accounts';
const BANKS_URL = '/banks';
const TYPES_URL = '/account-types';

export default function Accounts() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'Checking', institution: '', currency: 'USD', balance: 0, isLiquid: true, last4Digits: '' });

  // ── Adjustment State ──
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('contribution');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountHistory, setAccountHistory] = useState({}); // { accountId: [adjustments] }
  const [expandedHistory, setExpandedHistory] = useState({}); // { accountId: boolean }

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccounts = async () => {
    try {
      const [accRes, bankRes, typeRes] = await Promise.all([
        api.get(API_URL),
        api.get(BANKS_URL),
        api.get(TYPES_URL)
      ]);
      setAccounts(accRes.data);
      setBanks(bankRes.data);
      setAccountTypes(typeRes.data);

      let initCurrency = newAccount.currency;
      let initType = newAccount.type;
      let initInstitution = newAccount.institution;

      if (currencies.length > 0 && !newAccount.currency) {
        initCurrency = currencies[0].code;
      }
      if (typeRes.data.length > 0 && newAccount.type === 'Checking') {
        initType = typeRes.data[0].name;
      }
      if (bankRes.data.length > 0 && !newAccount.institution) {
        initInstitution = bankRes.data[0].name;
      }

      setNewAccount(p => ({
        ...p,
        currency: initCurrency,
        type: initType,
        institution: initInstitution
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.put(`${API_URL}/${editingAccount.id}`, newAccount);
      } else {
        await api.post(API_URL, newAccount);
      }
      setShowModal(false);
      setEditingAccount(null);
      setNewAccount({
        name: '',
        type: accountTypes.length ? accountTypes[0].name : 'Checking',
        institution: banks.length ? banks[0].name : '',
        currency: currencies.length ? currencies[0].code : 'USD',
        balance: 0,
        isLiquid: true,
        last4Digits: ''
      });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to create/edit account', err);
    }
  };

  const handleEditClick = (acc) => {
    setEditingAccount(acc);
    setNewAccount({
      name: acc.name,
      type: acc.type,
      institution: acc.institution,
      currency: acc.currency,
      balance: acc.balance,
      isLiquid: acc.isLiquid !== false,
      last4Digits: acc.last4Digits || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this account?'))) return;
    try {
      await api.delete(`${API_URL}/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account', err);
    }
  };

  // ── Adjustments logic ──
  const fetchAdjustments = async (id) => {
    try {
      const res = await api.get(`${API_URL}/${id}/adjustments`);
      setAccountHistory(prev => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error('Failed to fetch adjustments', err);
    }
  };

  const toggleHistory = (id) => {
    if (!expandedHistory[id]) {
      fetchAdjustments(id);
    }
    setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    try {
      await api.post(`${API_URL}/${adjustingAccount.id}/adjust`, {
        amount: adjustAmount,
        type: adjustType,
        note: adjustNote,
        date: adjustDate
      });
      setShowAdjustModal(false);
      setAdjustAmount('');
      setAdjustNote('');
      setAdjustDate(new Date().toISOString().split('T')[0]);
      fetchAccounts();
      if (expandedHistory[adjustingAccount.id]) {
        fetchAdjustments(adjustingAccount.id);
      }
    } catch (err) {
      console.error('Failed to adjust balance', err);
    }
  };

  const openAdjustModal = (acc) => {
    setAdjustingAccount(acc);
    setShowAdjustModal(true);
  };

  // Group and summarize accounts by currency (total, available, and long term)
  const currencySummaries = useMemo(() => {
    const summaries = {};
    accounts.forEach(acc => {
      const cur = acc.currency || 'USD';
      if (!summaries[cur]) {
        summaries[cur] = {
          total: 0,
          available: 0,
          longTerm: 0,
          accountsCount: 0
        };
      }
      const val = parseFloat(acc.balance) || 0;
      summaries[cur].total += val;
      if (acc.isLiquid !== false) {
        summaries[cur].available += val;
      } else {
        summaries[cur].longTerm += val;
      }
      summaries[cur].accountsCount += 1;
    });
    return summaries;
  }, [accounts]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">{t('Accounts')}</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">{t('Manage your banking and investment accounts')}</p>
        </div>
        <button onClick={() => {
          setEditingAccount(null);
          setNewAccount({ name: '', type: accountTypes.length ? accountTypes[0].name : 'Checking', institution: banks.length ? banks[0].name : '', currency: currencies.length ? currencies[0].code : 'USD', balance: 0, isLiquid: true, last4Digits: '' });
          setShowModal(true);
        }} className="btn-gold px-5 py-2 text-sm shadow-md flex items-center gap-1">
          <span className="text-lg leading-none">+</span> {t('Add Account')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card p-16 text-center border border-dashed border-brand-600">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-600/30 flex items-center justify-center text-gold-400/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <p className="text-slate-400 font-serif italic text-lg mb-6">{t('No accounts added yet.')}</p>
          <button onClick={() => setShowModal(true)} className="btn-glass px-6 py-2">
            {t('Add Your First Account')}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Currency Summaries ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(currencySummaries)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([curCode, summary]) => {
                const total = summary.total;
                const available = summary.available;
                const longTerm = summary.longTerm;

                const availablePct = total > 0 ? (available / total) * 100 : 0;
                const longTermPct = total > 0 ? (longTerm / total) * 100 : 0;

                return (
                  <div key={curCode} className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen transition-all group-hover:bg-gold-500/10"></div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Currency Summary')}</span>
                        <span className="px-2.5 py-1 bg-brand-900/50 border border-brand-600/40 text-gold-400 rounded-full text-xs font-semibold tracking-wider font-mono">
                          {curCode}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('Total Balance')}</p>
                      <p className="text-3xl font-light font-serif text-white tracking-wide mt-1">
                        {formatCurrency(total, curCode, currencies, settings?.language)}
                      </p>

                      {/* Progress bar split */}
                      {total > 0 && (
                        <div className="mt-6 space-y-4">
                          <div className="h-2 w-full bg-brand-900/60 rounded-full overflow-hidden flex border border-brand-600/30">
                            {available > 0 && (
                              <div
                                className="h-full bg-emerald-500/80 transition-all duration-500"
                                style={{ width: `${availablePct}%` }}
                                title={`${t('Available')}: ${availablePct.toFixed(1)}%`}
                              ></div>
                            )}
                            {longTerm > 0 && (
                              <div
                                className="h-full bg-gold-500/80 transition-all duration-500"
                                style={{ width: `${longTermPct}%` }}
                                title={`${t('Long-term')}: ${longTermPct.toFixed(1)}%`}
                              ></div>
                            )}
                          </div>

                          {/* Detail row */}
                          <div className="grid grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-inner"></div>
                                {t('Available Funds')}
                              </div>
                              <p className="text-base font-medium text-slate-200">
                                {formatCurrency(available, curCode, currencies, settings?.language)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {availablePct.toFixed(0)}% {t('of total')}
                              </p>
                            </div>

                            <div className="space-y-1 border-l border-brand-600/20 pl-4">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-gold-500/80 shadow-inner"></div>
                                {t('Long-term Assets')}
                              </div>
                              <p className="text-base font-medium text-slate-200">
                                {formatCurrency(longTerm, curCode, currencies, settings?.language)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {longTermPct.toFixed(0)}% {t('of total')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(acc => (
            <div key={acc.id} className="glass-card p-6 cursor-pointer hover:border-gold-500/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen transition-all group-hover:bg-gold-500/10"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-serif italic text-white text-xl tracking-wide line-clamp-1">{acc.name}</h3>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">
                    {acc.institution || 'Bank'} • {acc.type}
                    {acc.last4Digits && <span className="ml-2 font-mono text-gold-400/80">•••• {acc.last4Digits}</span>}
                    {acc.isLiquid === false && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-brand-600/50 text-[10px] text-gold-400/80 border border-gold-500/10">
                        {t('Long-term asset')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(acc); }} className="text-slate-400 hover:text-gold-400 transition-colors p-2 md:p-1 active:scale-90">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} className="text-slate-400 hover:text-rose-400 transition-colors p-2 md:p-1 active:scale-90">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div className="mt-8 flex items-end justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('Balance')}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openAdjustModal(acc); }}
                      className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded border border-emerald-500/20 transition-all flex items-center gap-1"
                    >
                      <span>+</span> {t('Adjust')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleHistory(acc.id); }}
                      className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-all ${
                        expandedHistory[acc.id]
                          ? 'bg-gold-500 text-brand-900 border-gold-500'
                          : 'bg-brand-900/60 hover:bg-brand-800/60 text-slate-400 border-brand-600/40'
                      }`}
                    >
                      {t('History')}
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-light font-serif text-white tracking-wide">
                  {formatCurrency(acc.balance, acc.currency, currencies, settings?.language)}
                </p>
              </div>

              {/* Collapsible History Section */}
              {expandedHistory[acc.id] && (
                <div className="mt-6 pt-6 border-t border-brand-600/30 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">{t('Recent Adjustments')}</h4>
                  <div className="space-y-3">
                    {accountHistory[acc.id]?.length > 0 ? (
                      accountHistory[acc.id].slice(0, 5).map(adj => (
                        <div key={adj.id} className="flex justify-between items-center group/item pb-2 border-b border-white/5 last:border-0">
                          <div className="min-w-0">
                            <p className="text-xs text-white font-medium truncate italic capitalize">
                              {t(adj.type)} {adj.note && <span className="text-slate-500 not-italic ml-1">— {adj.note}</span>}
                            </p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                              {new Date(adj.date).toLocaleDateString(settings?.language || 'en-US')}
                            </p>
                          </div>
                          <p className={`text-xs font-serif ${adj.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {adj.amount >= 0 ? '+' : ''}{formatCurrency(adj.amount, acc.currency, currencies, settings?.language)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500 italic text-center py-2">{t('No adjustments found')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {editingAccount ? t('Edit Account') : t('Add New Account')}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Account Name')}</label>
                  <input required type="text" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="e.g. Premium Checking" />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Last 4')}</label>
                  <input type="text" maxLength="4" value={newAccount.last4Digits || ''} onChange={e => setNewAccount({...newAccount, last4Digits: e.target.value.replace(/\D/g, '')})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-mono tracking-widest text-center" placeholder="1234" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Institution')}</label>
                  {banks.length > 0 ? (
                    <select value={newAccount.institution} onChange={e => setNewAccount({ ...newAccount, institution: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                      {banks.map(b => <option key={b.id} value={b.name} className="bg-brand-800">{b.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={newAccount.institution} onChange={e => setNewAccount({ ...newAccount, institution: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all" placeholder="e.g. Chase" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Type')}</label>
                  {accountTypes.length > 0 ? (
                    <select value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                      {accountTypes.map(t => <option key={t.id} value={t.name} className="bg-brand-800">{t.name}</option>)}
                    </select>
                  ) : (
                    <select value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                      <option className="bg-brand-800">{t('Checking')}</option>
                      <option className="bg-brand-800">{t('Savings')}</option>
                      <option className="bg-brand-800">{t('Credit Card')}</option>
                      <option className="bg-brand-800">{t('Investment')}</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Currency')}</label>
                  <select value={newAccount.currency} onChange={e => setNewAccount({ ...newAccount, currency: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                    {currencies.map(c => (
                      <option key={c.id} value={c.code} className="bg-brand-800">{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Starting Balance')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">
                      {currencies.find(c => c.code === (newAccount.currency || 'USD'))?.symbol || '$'}
                    </span>
                    <AmountInput value={newAccount.balance} onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })} className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input type="checkbox" checked={newAccount.isLiquid !== false} onChange={e => setNewAccount({ ...newAccount, isLiquid: e.target.checked })} className="sr-only peer" />
                  <div className="w-9 h-5 bg-brand-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-500/80 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">{t('Available for spending')}</span>
                  <span className="text-[10px] text-slate-500 italic">{t('Used to align your liquidity forecast')}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => { setShowModal(false); setEditingAccount(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-6 py-2 text-sm">{editingAccount ? t('Save Changes') : t('Save Account')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>

            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {t('Adjust Balance')}
              <span className="block text-sm font-sans text-slate-400 tracking-normal italic mt-1">{adjustingAccount?.name}</span>
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-emerald-500/50"></span>
            </h2>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Amount to add/subtract')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">
                      {currencies.find(c => c.code === adjustingAccount?.currency)?.symbol || '$'}
                    </span>
                    <AmountInput
                      required
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all font-serif"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Date')}</label>
                  <input
                    type="date"
                    required
                    value={adjustDate}
                    onChange={e => setAdjustDate(e.target.value)}
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all text-sm appearance-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Adjustment Type')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['contribution', 'interest', 'withdrawal', 'correction'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAdjustType(type)}
                      className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                        adjustType === type
                          ? 'bg-emerald-500 text-brand-900 border-emerald-500'
                          : 'bg-brand-900/40 text-slate-400 border-brand-600/30 hover:border-emerald-500/30'
                      }`}
                    >
                      {t(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Note')}</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all font-serif"
                  placeholder={t('e.g. Monthly contribution')}
                />
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-emerald px-6 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-brand-900 font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">{t('Apply Adjustment')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
