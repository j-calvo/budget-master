import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

const API_URL = 'http://localhost:5001/api/credit-cards';
const CURR_URL = 'http://localhost:5001/api/currencies';

export default function CreditCards() {
  const { settings } = useSettings();
  const [cards, setCards] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteData, setDeleteData] = useState({ id: null, name: null });
  const [formData, setFormData] = useState({ 
    id: null, name: '', limit: '', balance: 0, dueDate: 1, apr: 0, currency: 'USD' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cardRes, currRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(CURR_URL)
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
        await axios.put(`${API_URL}/${formData.id}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }
      setShowModal(false);
      setFormData({ id: null, name: '', limit: '', balance: 0, dueDate: 1, apr: 0, currency: currencies[0]?.code || 'USD' });
      fetchData();
    } catch (err) {
      console.error('Failed to save credit card', err);
    }
  };

  const handleDeleteCard = async () => {
    try {
      if(deleteData.id) await axios.delete(`${API_URL}/${deleteData.id}`);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Credit Cards</h1>
        <button 
          onClick={() => {
            setFormData({ id: null, name: '', limit: '', balance: 0, dueDate: 1, apr: 0, currency: currencies.length ? currencies[0].code : 'USD' });
            setShowModal(true);
          }} 
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Add Credit Card
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading your cards...</div>
      ) : cards.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 border-dashed text-center">
          <p className="text-slate-500 text-lg mb-4">No credit cards added yet.</p>
          <button 
            onClick={() => {
              setFormData({ id: null, name: '', limit: '', balance: 0, dueDate: 1, apr: 0, currency: currencies.length ? currencies[0].code : 'USD' });
              setShowModal(true);
            }} 
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map(card => {
            const utilization = Math.min(100, Math.round((card.balance / card.limit) * 100)) || 0;
            const isHighUtil = utilization > 30; // Standard credit utilization warning threshold
            
            return (
              <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative group flex flex-col justify-between hover:border-primary-300 transition-colors">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(card)} className="text-slate-300 hover:text-primary-600 p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => setDeleteData({ id: card.id, name: card.name })} className="text-slate-300 hover:text-red-600 p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="mb-4 pr-16">
                  <h3 className="font-bold text-slate-800 text-lg">{card.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Due Date: {card.dueDate}{['st','nd','rd'][((card.dueDate+90)%100-10)%10-1]||'th'} • APR: {card.apr}%</p>
                </div>

                <div>
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-slate-800 mb-1">
                      {formatCurrency(card.balance, card.currency)}
                    </p>
                    <p className="text-sm text-slate-500">
                      of {formatCurrency(card.limit, card.currency)} limit
                    </p>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                    <div className={`${isHighUtil ? 'bg-red-500' : 'bg-primary-500'} h-2 rounded-full`} style={{ width: `${utilization}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={isHighUtil ? 'text-red-500' : 'text-slate-500'}>{utilization}% Utilized</span>
                    <span className="text-slate-400">{formatCurrency(card.limit - card.balance, card.currency)} available</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Credit Card Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md my-8">
            <h2 className="text-2xl font-bold mb-6">{formData.id ? 'Edit' : 'Add'} Credit Card</h2>
            <form onSubmit={handleSaveCard} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Chase Sapphire Reserve" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit</label>
                  <input required type="number" step="0.01" value={formData.limit} onChange={e => setFormData({...formData, limit: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Balance</label>
                  <input required type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">APR (%)</label>
                  <input required type="number" step="0.01" value={formData.apr} onChange={e => setFormData({...formData, apr: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="19.99" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (Day)</label>
                  <input required type="number" min="1" max="31" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="15" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  {currencies.map(c => (
                    <option key={c.id} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                  {currencies.length === 0 && <option value="USD">USD ($)</option>}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg transition-colors font-medium shadow-sm">Save Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteData.id && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Credit Card?</h3>
            <p className="text-slate-500 mb-6 font-medium">Are you sure you want to delete "{deleteData.name}"? This action cannot be undone.</p>
            
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteData({ id: null, name: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex-1 font-medium">Cancel</button>
              <button onClick={handleDeleteCard} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 font-medium shadow-sm border border-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
