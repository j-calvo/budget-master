import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';

const API_URL = '/accounts';
const CURR_URL = '/currencies';
const BANKS_URL = '/banks';
const TYPES_URL = '/account-types';

export default function Accounts() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'Checking', institution: '', currency: 'USD', balance: 0 });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const [accRes, currRes, bankRes, typeRes] = await Promise.all([
        api.get(API_URL),
        api.get(CURR_URL),
        api.get(BANKS_URL),
        api.get(TYPES_URL)
      ]);
      setAccounts(accRes.data);
      setCurrencies(currRes.data);
      setBanks(bankRes.data);
      setAccountTypes(typeRes.data);

      let initCurrency = newAccount.currency;
      let initType = newAccount.type;
      let initInstitution = newAccount.institution;

      if (currRes.data.length > 0 && !newAccount.currency) {
        initCurrency = currRes.data[0].code;
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
        balance: 0
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
      balance: acc.balance
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`${API_URL}/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">{t('Accounts')}</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">{t('Manage your banking and investment accounts')}</p>
        </div>
        <button onClick={() => {
          setEditingAccount(null);
          setNewAccount({ name: '', type: accountTypes.length ? accountTypes[0].name : 'Checking', institution: banks.length ? banks[0].name : '', currency: currencies.length ? currencies[0].code : 'USD', balance: 0 });
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <div key={acc.id} className="glass-card p-6 cursor-pointer hover:border-gold-500/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen transition-all group-hover:bg-gold-500/10"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-serif italic text-white text-xl tracking-wide line-clamp-1">{acc.name}</h3>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">{acc.institution || 'Bank'} • {acc.type}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(acc); }} className="text-slate-400 hover:text-gold-400 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} className="text-slate-400 hover:text-rose-400 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div className="mt-8 flex items-end justify-between">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('Balance')}</p>
                <p className="text-2xl font-light font-serif text-white tracking-wide">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency || 'USD' }).format(acc.balance)}
                </p>
              </div>
            </div>
          ))}
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
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Account Name')}</label>
                <input required type="text" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="e.g. Premium Checking" />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      <option className="bg-brand-800">Checking</option>
                      <option className="bg-brand-800">Savings</option>
                      <option className="bg-brand-800">Credit Card</option>
                      <option className="bg-brand-800">Investment</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                    <input type="number" step="0.01" value={newAccount.balance} onChange={e => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })} className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" />
                  </div>
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
    </div>
  );
}
