import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';

const CATS_URL = '/categories';
const CURR_URL = '/currencies';
const BANKS_URL = '/banks';
const TYPES_URL = '/account-types';

export default function SettingsData() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showCurrModal, setShowCurrModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [deleteData, setDeleteData] = useState({ type: null, id: null, name: null });

  // Forms
  const [catForm, setCatForm] = useState({ id: null, name: '', type: 'expense', color: '#ef4444' });
  const [currForm, setCurrForm] = useState({ id: null, code: '', symbol: '', name: '' });
  const [bankForm, setBankForm] = useState({ id: null, name: '' });
  const [typeForm, setTypeForm] = useState({ id: null, name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, currRes, bankRes, typeRes] = await Promise.all([
        api.get(CATS_URL),
        api.get(CURR_URL),
        api.get(BANKS_URL),
        api.get(TYPES_URL)
      ]);
      setCategories(catRes.data);
      setCurrencies(currRes.data);
      setBanks(bankRes.data);
      setAccountTypes(typeRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Category Handlers
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await api.put(`${CATS_URL}/${catForm.id}`, catForm);
      } else {
        await api.post(CATS_URL, catForm);
      }
      setShowCatModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save category', err);
    }
  };

  const handleDeleteCategory = async () => {
    try {
      if (deleteData.id) await api.delete(`${CATS_URL}/${deleteData.id}`);
      setDeleteData({ type: null, id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  // Currency Handlers
  const handleSaveCurrency = async (e) => {
    e.preventDefault();
    try {
      if (currForm.id) {
        await api.put(`${CURR_URL}/${currForm.id}`, currForm);
      } else {
        await api.post(CURR_URL, currForm);
      }
      setShowCurrModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save currency', err);
    }
  };

  const handleDeleteCurrency = async () => {
    try {
      if (deleteData.id) await api.delete(`${CURR_URL}/${deleteData.id}`);
      setDeleteData({ type: null, id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete currency', err);
    }
  };

  // Bank Handlers
  const handleSaveBank = async (e) => {
    e.preventDefault();
    try {
      if (bankForm.id) {
        await api.put(`${BANKS_URL}/${bankForm.id}`, bankForm);
      } else {
        await api.post(BANKS_URL, bankForm);
      }
      setShowBankModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save bank', err);
      if (err.response?.data?.error) alert(err.response.data.error);
    }
  };

  const handleDeleteBank = async () => {
    try {
      if (deleteData.id) await api.delete(`${BANKS_URL}/${deleteData.id}`);
      setDeleteData({ type: null, id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete bank', err);
    }
  };

  // Account Type Handlers
  const handleSaveAccountType = async (e) => {
    e.preventDefault();
    try {
      if (typeForm.id) {
        await api.put(`${TYPES_URL}/${typeForm.id}`, typeForm);
      } else {
        await api.post(TYPES_URL, typeForm);
      }
      setShowTypeModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save account type', err);
      if (err.response?.data?.error) alert(err.response.data.error);
    }
  };

  const handleDeleteAccountType = async () => {
    try {
      if (deleteData.id) await api.delete(`${TYPES_URL}/${deleteData.id}`);
      setDeleteData({ type: null, id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete account type', err);
    }
  };

  return (
    <div className="space-y-8 mt-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Categories Section */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white flex items-center gap-2">
              <div className="w-1 h-5 bg-rose-500 rounded-full"></div>
              {t('Budget Categories')}
            </h2>
            <button onClick={() => { setCatForm({ id: null, name: '', type: 'expense', color: '#ef4444' }); setShowCatModal(true); }} className="text-[10px] font-bold uppercase tracking-widest text-brand-900 bg-rose-500 hover:bg-rose-400 px-3.5 py-2 rounded-lg transition-colors shadow-[0_0_10px_rgba(244,63,94,0.3)]">
              + Category
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-4 bg-brand-900/40 border border-brand-600/30 rounded-xl hover:border-brand-500/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-900 shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: cat.color }}></div>
                  <div>
                    <p className="font-bold text-slate-200 tracking-wide">{cat.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{cat.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setCatForm(cat); setShowCatModal(true); }} className="text-slate-400 hover:text-gold-400 text-sm transition-colors">Edit</button>
                  <button onClick={() => setDeleteData({ type: 'category', id: cat.id, name: cat.name })} className="text-slate-400 hover:text-rose-500 text-sm transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Currencies Section */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white flex items-center gap-2">
              <div className="w-1 h-5 bg-gold-500 rounded-full"></div>
              {t('Currencies')}
            </h2>
            <button onClick={() => { setCurrForm({ id: null, code: '', symbol: '', name: '' }); setShowCurrModal(true); }} className="text-[10px] font-bold uppercase tracking-widest text-brand-900 bg-gold-500 hover:bg-gold-400 px-3.5 py-2 rounded-lg transition-colors shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              + Currency
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {currencies.map(curr => (
              <div key={curr.id} className="flex justify-between items-center p-4 bg-brand-900/40 border border-brand-600/30 rounded-xl hover:border-brand-500/50 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="text-gold-400 font-serif font-bold text-2xl w-10 text-center glow-text-gold">
                    {curr.symbol}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 tracking-wide">{curr.code}</p>
                    <p className="text-xs text-slate-400 font-serif italic mt-0.5">{curr.name}</p>
                  </div>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setCurrForm(curr); setShowCurrModal(true); }} className="text-slate-400 hover:text-gold-400 text-sm transition-colors">Edit</button>
                  <button onClick={() => setDeleteData({ type: 'currency', id: curr.id, name: curr.name })} className="text-slate-400 hover:text-rose-500 text-sm transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Banks Section */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white flex items-center gap-2">
              <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
              {t('Banks & Institutions')}
            </h2>
            <button onClick={() => { setBankForm({ id: null, name: '' }); setShowBankModal(true); }} className="text-[10px] font-bold uppercase tracking-widest text-brand-900 bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 rounded-lg transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              + Bank
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {banks.map(bank => (
              <div key={bank.id} className="flex justify-between items-center p-4 bg-brand-900/40 border border-brand-600/30 rounded-xl hover:border-brand-500/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="text-emerald-400 w-10 text-center">
                    <svg className="w-6 h-6 mx-auto drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <p className="font-bold text-slate-200 tracking-wide">{bank.name}</p>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setBankForm(bank); setShowBankModal(true); }} className="text-slate-400 hover:text-gold-400 text-sm transition-colors">Edit</button>
                  <button onClick={() => setDeleteData({ type: 'bank', id: bank.id, name: bank.name })} className="text-slate-400 hover:text-rose-500 text-sm transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Types Section */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white flex items-center gap-2">
              <div className="w-1 h-5 bg-sky-500 rounded-full"></div>
              {t('Account Types')}
            </h2>
            <button onClick={() => { setTypeForm({ id: null, name: '' }); setShowTypeModal(true); }} className="text-[10px] font-bold uppercase tracking-widest text-brand-900 bg-sky-500 hover:bg-sky-400 px-3.5 py-2 rounded-lg transition-colors shadow-[0_0_10px_rgba(14,165,233,0.3)]">
              + Type
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {accountTypes.map(type => (
              <div key={type.id} className="flex justify-between items-center p-4 bg-brand-900/40 border border-brand-600/30 rounded-xl hover:border-brand-500/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="text-sky-400 w-10 text-center">
                    <svg className="w-6 h-6 mx-auto drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  </div>
                  <p className="font-bold text-slate-200 tracking-wide">{type.name}</p>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setTypeForm(type); setShowTypeModal(true); }} className="text-slate-400 hover:text-gold-400 text-sm transition-colors">Edit</button>
                  <button onClick={() => setDeleteData({ type: 'accountType', id: type.id, name: type.name })} className="text-slate-400 hover:text-rose-500 text-sm transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setShowCatModal(false)}></div>
          <div className="glass-panel relative w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
              {catForm.id ? 'Edit' : 'Add'} Category
            </h2>
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Name</label>
                <input required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-serif placeholder-slate-600" placeholder="e.g. Dining Out" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type</label>
                  <select value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all appearance-none cursor-pointer">
                    <option value="expense" className="bg-brand-800">Expense</option>
                    <option value="income" className="bg-brand-800">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })} className="w-12 h-12 p-1 bg-brand-900/50 border border-brand-600/30 rounded-lg cursor-pointer" />
                    <span className="text-slate-400 text-sm font-mono uppercase bg-brand-900/50 border border-brand-600/30 px-3 py-2 rounded-lg flex-1 text-center">{catForm.color}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-brand-800">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-brand-900 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_15px_rgba(244,63,94,0.4)]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setShowCurrModal(false)}></div>
          <div className="glass-panel relative w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gold-500 rounded-full"></div>
              {currForm.id ? 'Edit' : 'Add'} Currency
            </h2>
            <form onSubmit={handleSaveCurrency} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Code (USD)</label>
                  <input required maxLength={3} value={currForm.code} onChange={e => setCurrForm({ ...currForm, code: e.target.value.toUpperCase() })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all font-serif placeholder-slate-600 uppercase" placeholder="EUR" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Symbol (€)</label>
                  <input required maxLength={5} value={currForm.symbol} onChange={e => setCurrForm({ ...currForm, symbol: e.target.value })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all font-serif placeholder-slate-600" placeholder="€" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input required value={currForm.name} onChange={e => setCurrForm({ ...currForm, name: e.target.value })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all font-serif placeholder-slate-600" placeholder="e.g. Euro" />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-brand-800">
                <button type="button" onClick={() => setShowCurrModal(false)} className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="btn-gold px-6 py-2.5 text-xs font-bold uppercase tracking-widest">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setShowBankModal(false)}></div>
          <div className="glass-panel relative w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              {bankForm.id ? 'Edit' : 'Add'} Bank
            </h2>
            <form onSubmit={handleSaveBank} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Institution Name</label>
                <input required value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-serif placeholder-slate-600" placeholder="e.g. Chase Bank" />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-brand-800">
                <button type="button" onClick={() => setShowBankModal(false)} className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-brand-900 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setShowTypeModal(false)}></div>
          <div className="glass-panel relative w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
              {typeForm.id ? 'Edit' : 'Add'} Account Type
            </h2>
            <form onSubmit={handleSaveAccountType} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type Name</label>
                <input required value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} className="w-full bg-brand-900/50 border border-brand-600/30 text-white rounded-lg p-3 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-serif placeholder-slate-600" placeholder="e.g. Checking" />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-brand-800">
                <button type="button" onClick={() => setShowTypeModal(false)} className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-brand-900 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_15px_rgba(14,165,233,0.4)]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteData.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setDeleteData({ type: null, id: null, name: null })}></div>
          <div className="glass-panel relative w-full max-w-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300 border-rose-500/30">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <svg className="w-10 h-10 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif text-white mb-2">{t('Delete {{type}}?', { type: deleteData.type === 'category' ? t('Category') : deleteData.type === 'currency' ? t('Currency') : deleteData.type === 'bank' ? t('Bank') : t('Account Type') })}</h3>
            <p className="text-slate-400 mb-8 font-serif italic">{t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', { name: deleteData.name })}</p>

            <div className="flex gap-4 justify-center">
              <button onClick={() => setDeleteData({ type: null, id: null, name: null })} className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex-1 bg-brand-900/50 border border-brand-600/30 rounded-lg">Cancel</button>
              <button onClick={deleteData.type === 'category' ? handleDeleteCategory : deleteData.type === 'currency' ? handleDeleteCurrency : deleteData.type === 'bank' ? handleDeleteBank : handleDeleteAccountType} className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex-1 shadow-[0_0_15px_rgba(244,63,94,0.4)]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
