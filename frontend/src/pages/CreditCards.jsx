import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';

const API_URL = '/credit-cards';
const CURR_URL = '/currencies';

export default function CreditCards() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [cards, setCards] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteData, setDeleteData] = useState({ id: null, name: null });
  const [formData, setFormData] = useState({ 
    id: null, name: '', limit: '', balance: 0, dueDate: 1, statementDay: 1, apr: 0, currency: 'USD' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cardRes, currRes] = await Promise.all([
        api.get(API_URL),
        api.get(CURR_URL)
      ]);
      setCards(cardRes.data);
      setCurrencies(currRes.data);
      if (currRes.data.length > 0 && formData.currency === 'USD') {
        setFormData(p => ({ ...p, currency: currRes.data[0].code }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`${API_URL}/${formData.id}`, formData);
      } else {
        await api.post(API_URL, formData);
      }
      setShowModal(false);
      setFormData({ id: null, name: '', limit: '', balance: 0, dueDate: 1, statementDay: 1, apr: 0, currency: currencies[0]?.code || 'USD' });
      fetchData();
    } catch (err) {
      console.error('Failed to save credit card', err);
    }
  };

  const handleDeleteCard = async () => {
    try {
      if(deleteData.id) await api.delete(`${API_URL}/${deleteData.id}`);
      setDeleteData({ id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete credit card', err);
    }
  };

  const formatCurrency = (amount, currencyCode) => {
    return new Intl.NumberFormat(settings?.language || 'en-US', {
      style: 'currency',
      currency: currencyCode || 'USD'
    }).format(amount);
  };

  const openEditModal = (card) => {
    setFormData(card);
    setShowModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">{t('Credit Cards')}</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">{t('Track your credit utilization and bills')}</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: null, name: '', limit: '', balance: 0, dueDate: 1, apr: 0, currency: currencies.length ? currencies[0].code : 'USD' });
            setShowModal(true);
          }} 
          className="btn-gold px-5 py-2 text-sm shadow-md flex items-center gap-1"
        >
          <span className="text-lg leading-none">+</span> {t('Add Card')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card p-16 text-center border border-dashed border-brand-600">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-600/30 flex items-center justify-center text-gold-400/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <p className="text-slate-400 font-serif italic text-lg mb-6">{t('No credit cards added yet.')}</p>
          <button 
            onClick={() => {
              setFormData({ id: null, name: '', limit: '', balance: 0, dueDate: 1, statementDay: 1, apr: 0, currency: currencies.length ? currencies[0].code : 'USD' });
              setShowModal(true);
            }} 
            className="btn-glass px-6 py-2"
          >
            {t('Add Your First Card')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map(card => {
            const utilization = Math.min(100, Math.round((card.balance / card.limit) * 100)) || 0;
            const isHighUtil = utilization > 30;
            
            return (
              <div key={card.id} className="glass-card p-6 relative group flex flex-col justify-between hover:border-gold-500/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen transition-all group-hover:bg-gold-500/10"></div>
                
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(card)} className="text-slate-400 hover:text-gold-400 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => setDeleteData({ id: card.id, name: card.name })} className="text-slate-400 hover:text-rose-400 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="mb-6 pr-16">
                  <h3 className="font-serif italic text-white text-xl tracking-wide line-clamp-1">{card.name}</h3>
                  <div className="flex gap-3 text-xs font-medium uppercase tracking-widest mt-2">
                    <span className="text-slate-400">{t('Due:')} <span className="text-slate-300">{card.dueDate}</span></span>
                    <span className="text-brand-600">•</span>
                    <span className="text-slate-400">{t('APR:')} <span className="text-slate-300">{card.apr}%</span></span>
                  </div>
                </div>

                <div>
                  <div className="mb-5">
                    <p className="text-3xl font-light font-serif text-white mb-1 tracking-wide">
                      {formatCurrency(card.balance, card.currency)}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      {t('of {{limit}} limit', { limit: formatCurrency(card.limit, card.currency) })}
                    </p>
                  </div>
                  
                  <div className="w-full bg-brand-900/50 rounded-full h-1.5 mb-2 overflow-hidden border border-brand-600/30">
                    <div className={`${isHighUtil ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)]'} h-full rounded-full transition-all duration-1000`} style={{ width: `${utilization}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-medium uppercase tracking-wider">
                    <span className={isHighUtil ? 'text-rose-400' : 'text-gold-400'}>{t('{{utilization}}% Utilized', { utilization })}</span>
                    <span className="text-slate-500">{t('{{available}} avl.', { available: formatCurrency(card.limit - card.balance, card.currency) })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit Card Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden my-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {formData.id ? t('Edit') : t('Add')} {t('Credit Card')}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>
            
            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Card Name</label>
                <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="e.g. Sapphire Reserve" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Credit Limit')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                    <input required type="number" step="0.01" value={formData.limit === 0 ? '' : formData.limit} onChange={e => setFormData({...formData, limit: e.target.value})} className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Current Balance')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                    <input required type="number" step="0.01" value={formData.balance === 0 ? '' : formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full pl-8 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('APR (%)')}</label>
                  <input required type="number" step="0.01" value={formData.apr === 0 ? '' : formData.apr} onChange={e => setFormData({...formData, apr: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="19.99" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Due Date (Day)')}</label>
                  <input required type="number" min="1" max="31" value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="15" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Statement Day')}</label>
                  <input required type="number" min="1" max="31" value={formData.statementDay || ''} onChange={e => setFormData({...formData, statementDay: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Currency</label>
                  <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                  {currencies.map(c => (
                    <option key={c.id} value={c.code} className="bg-brand-800">{c.code} ({c.symbol})</option>
                  ))}
                  {currencies.length === 0 && <option value="USD" className="bg-brand-800">USD ($)</option>}
                </select>
              </div>
            </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-6 py-2 text-sm">{t('Save Card')}</button>
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
            <h3 className="text-xl font-serif text-white mb-2 tracking-wide">{t('Delete Credit Card?')}</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', { name: deleteData.name })}</p>
            
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setDeleteData({ id: null, name: null })} 
                className="btn-glass px-4 py-2.5 flex-1 text-sm tracking-wide"
              >
                {t('Cancel')}
              </button>
              <button 
                onClick={handleDeleteCard} 
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
