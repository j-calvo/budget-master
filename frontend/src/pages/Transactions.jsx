import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';

const API_URL = '/transactions';
const ACCTS_URL = '/accounts';
const CATS_URL = '/categories';

export default function Transactions() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [newTx, setNewTx] = useState({ amount: '', date: '', description: '', accountId: '', categoryId: '', type: 'expense' });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        api.get(API_URL),
        api.get(ACCTS_URL),
        api.get(CATS_URL)
      ]);
      setTransactions(txRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      
      if (accRes.data.length > 0) setNewTx(prev => ({ ...prev, accountId: accRes.data[0].id }));
      if (catRes.data.length > 0) setNewTx(prev => ({ ...prev, categoryId: catRes.data[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newTx,
        amount: parseFloat(newTx.amount) || 0
      };
      
      if (editingTx) {
        await api.put(`${API_URL}/${editingTx.id}`, payload);
      } else {
        await api.post(API_URL, payload);
      }

      setShowModal(false);
      setEditingTx(null);
      setNewTx(prev => ({ ...prev, amount: '', description: '', type: 'expense' }));
      fetchData();
    } catch (err) {
      console.error('Failed to create/edit tx', err);
    }
  };

  const handleEditClick = (tx) => {
    setEditingTx(tx);
    setNewTx({
      amount: tx.amount,
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : '',
      description: tx.description,
      accountId: tx.accountId,
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

          {accounts.length > 0 ? (
            <button onClick={() => {
              setEditingTx(null);
              setNewTx({ amount: '', date: '', description: '', accountId: accounts[0]?.id || '', categoryId: categories[0]?.id || '', type: 'expense' });
              setShowModal(true);
            }} className="btn-gold px-5 py-2 text-sm shadow-md ml-2 flex items-center gap-1">
              <span className="text-lg leading-none">+</span> {t('New')}
            </button>
          ) : (
            <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 ml-2 shadow-[0_0_10px_rgba(244,63,94,0.1)]">{t('Add an account first')}</p>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-brand-600/50 bg-brand-900/40 text-xs font-semibold uppercase tracking-wider text-slate-400 grid grid-cols-6 gap-4">
          <div className="col-span-2">{t('Description')}</div>
          <div>{t('Category')}</div>
          <div>{t('Date')}</div>
          <div className="text-right">{t('Amount')}</div>
          <div className="text-right">{t('Actions')}</div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-16 text-center text-slate-500 italic font-serif">
            {t('No transactions found.')}
          </div>
        ) : (
          <div className="divide-y divide-brand-600/30">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 grid grid-cols-6 gap-4 items-center hover:bg-brand-600/20 transition-colors group">
                <div className="col-span-2 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif italic text-lg shadow-inner shrink-0
                    ${tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'}`}>
                    {tx.description.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{tx.description}</p>
                    <p className="text-xs text-slate-500">{tx.account?.name}</p>
                  </div>
                </div>
                <div>
                  <span className="inline-block px-2.5 py-1 bg-brand-900/50 border border-brand-600/40 text-slate-300 rounded-md text-xs font-medium tracking-wide">
                    {tx.category?.name || 'Uncategorized'}
                  </span>
                </div>
                <div className="text-sm text-slate-400 uppercase tracking-wide">
                  {new Date(tx.date).toLocaleDateString(settings?.language || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className={`text-right font-serif tracking-wide text-lg ${tx.type === 'expense' ? 'text-slate-300' : 'text-gold-400 drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]'}`}>
                  {tx.type === 'expense' ? '-' : '+'}
                  {new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: tx.account?.currency || settings?.defaultCurrency || 'USD' }).format(tx.amount)}
                </div>
                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(tx)} className="text-slate-400 hover:text-gold-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Amount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                  <input required type="number" step="0.01" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="0.00" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Description')}</label>
                <input required type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all" placeholder="e.g. Weekly Groceries" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Account')}</label>
                  <select value={newTx.accountId} onChange={e => setNewTx({...newTx, accountId: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                    {accounts.map(acc => <option key={acc.id} value={acc.id} className="bg-brand-800">{acc.name} (${acc.balance})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Category')}</label>
                  <select value={newTx.categoryId} onChange={e => setNewTx({...newTx, categoryId: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                    {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-brand-800">{cat.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => { setShowModal(false); setEditingTx(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-6 py-2 text-sm">{editingTx ? t('Save Changes') : t('Save Transaction')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
