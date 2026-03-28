import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';

const API_URL = '/budgets';
const CATS_URL = '/categories';

export default function Budgets() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '', currency: 'CRC', payDay: '' });
  const [deleteData, setDeleteData] = useState({ id: null, name: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budRes, catRes, currRes] = await Promise.allSettled([
        api.get(API_URL),
        api.get(CATS_URL),
        api.get('/currencies')
      ]);

      if (budRes.status === 'fulfilled') {
        setBudgets(budRes.value.data);
      } else {
        console.error('Failed to fetch budgets:', budRes.reason);
      }

      if (currRes.status === 'fulfilled') {
        setCurrencies(currRes.value.data);
      } else {
        console.error('Failed to fetch currencies:', currRes.reason);
      }

      if (catRes.status === 'fulfilled') {
        // Filter out income categories for budgeting
        const expCats = catRes.value.data.filter(c => c.type !== 'income');
        setCategories(expCats);
        if (expCats.length > 0) {
          setNewBudget(p => ({ ...p, categoryId: expCats[0].id }));
        }
      } else {
        console.error('Failed to fetch categories:', catRes.reason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        categoryId: newBudget.categoryId,
        amount: parseFloat(newBudget.amount) || 0,
        currency: newBudget.currency || 'CRC',
        payDay: newBudget.payDay ? parseInt(newBudget.payDay) : null
      };
      if (editingBudget) {
        await api.put(`${API_URL}/${editingBudget.id}`, payload);
      } else {
        await api.post(API_URL, payload);
      }
      setShowModal(false);
      setEditingBudget(null);
      setNewBudget(p => ({ ...p, amount: '', currency: 'CRC', payDay: '' }));
      fetchData();
    } catch (err) {
      console.error('Failed to save budget', err);
    }
  };

  const handleEditClick = (budget) => {
    setEditingBudget(budget);
    setNewBudget({
      categoryId: budget.categoryId,
      amount: budget.amount,
      currency: budget.currency || 'CRC',
      payDay: budget.payDay || ''
    });
    setShowModal(true);
  };

  const handleDeleteBudget = async () => {
    try {
      if(deleteData.id) await api.delete(`${API_URL}/${deleteData.id}`);
      setDeleteData({ id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete budget', err);
    }
  };

  const formatCurrency = (amount, currencyCode) => {
    return new Intl.NumberFormat(settings?.language || 'en-US', {
      style: 'currency',
      currency: currencyCode || settings?.defaultCurrency || 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">{t('Budgets')}</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">{t('Manage your monthly spending limits')}</p>
        </div>
        <button onClick={() => {
          setEditingBudget(null);
          setNewBudget(p => ({ ...p, amount: '', currency: 'CRC', payDay: '' }));
          setShowModal(true);
        }} className="btn-gold px-5 py-2 text-sm shadow-md flex items-center gap-1">
          <span className="text-lg leading-none">+</span> {t('Create Budget')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
        </div>
      ) : budgets.length === 0 ? (
        <div className="glass-card p-16 text-center border border-dashed border-brand-600">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-600/30 flex items-center justify-center text-gold-400/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-slate-400 font-serif italic text-lg mb-6">{t('No budgets set for this month.')}</p>
          <button onClick={() => setShowModal(true)} className="btn-glass px-6 py-2">
            {t('Create Your First Budget')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map(budget => {
            const pct = Math.min(100, Math.round((budget.spent / budget.amount) * 100)) || 0;
            const isOver = budget.spent > budget.amount;
            const barColor = isOver ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : (pct > 75 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)]');
            const textColor = isOver ? 'text-rose-400' : 'text-slate-400';
            const valueColor = isOver ? 'text-rose-300' : 'text-white';

            return (
              <div key={budget.id} className="glass-card p-6 relative group hover:border-gold-500/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen transition-all group-hover:bg-gold-500/10"></div>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button 
                    onClick={() => handleEditClick(budget)}
                    className="text-slate-400 hover:text-gold-400 p-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setDeleteData({ id: budget.id, name: budget.category?.name })}
                    className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="flex justify-between items-start mb-6 pr-12">
                  <h3 className="font-serif italic text-white text-xl tracking-wide line-clamp-1" title={budget.category?.name}>{budget.category?.name}</h3>
                </div>

                <div className="mb-2 flex justify-between items-end">
                  <span className={`text-2xl font-light font-serif tracking-wide ${valueColor}`}>
                    {formatCurrency(budget.spent, budget.currency)}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
                    {t('of {{total}}', { total: formatCurrency(budget.amount, budget.currency) })}
                  </span>
                </div>

                <div className="w-full bg-brand-900/50 rounded-full h-1.5 mb-3 overflow-hidden border border-brand-600/30">
                  <div className={`${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                </div>

                <p className={`text-xs font-medium uppercase tracking-wider text-right ${textColor}`}>
                  {isOver 
                    ? t('Over by {{amount}}', { amount: formatCurrency(budget.spent - budget.amount, budget.currency) })
                    : t('{{pct}}% Utilized', { pct })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {editingBudget ? t('Edit Budget') : t('Set Budget')}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>

            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Category')}</label>
                <select 
                  value={newBudget.categoryId} 
                  onChange={e => setNewBudget({...newBudget, categoryId: e.target.value})} 
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  required
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-brand-800">{cat.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Monthly Amount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={newBudget.amount} 
                    onChange={e => setNewBudget({...newBudget, amount: e.target.value})} 
                    className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Currency')}</label>
                  <select 
                    value={newBudget.currency || 'CRC'} 
                    onChange={e => setNewBudget({...newBudget, currency: e.target.value})} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  >
                    {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-800">{c.code} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Pay Day (Optional)')}</label>
                  <input 
                    type="number" 
                    min="1" max="31"
                    value={newBudget.payDay || ''} 
                    onChange={e => setNewBudget({...newBudget, payDay: e.target.value})} 
                    className="w-full px-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all" 
                    placeholder="1-31" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => { setShowModal(false); setEditingBudget(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-6 py-2 text-sm">{editingBudget ? t('Save Changes') : t('Save Budget')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteData.id && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-sm text-center border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif text-white mb-2 tracking-wide">{t('Delete Budget?')}</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t('Are you sure you want to delete the "{{name}}" budget? This action cannot be undone.', { name: deleteData.name })}</p>
            
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setDeleteData({ id: null, name: null })} 
                className="btn-glass px-4 py-2.5 flex-1 text-sm tracking-wide"
              >
                {t('Cancel')}
              </button>
              <button 
                onClick={handleDeleteBudget} 
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-lg transition-colors flex-1 text-sm font-medium shadow-[0_0_15px_rgba(244,63,94,0.3)] tracking-wide"
              >
                {t('Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
