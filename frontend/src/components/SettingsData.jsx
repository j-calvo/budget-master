import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CATS_URL = 'http://localhost:5001/api/categories';
const CURR_URL = 'http://localhost:5001/api/currencies';

export default function SettingsData() {
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showCurrModal, setShowCurrModal] = useState(false);
  const [deleteData, setDeleteData] = useState({ type: null, id: null, name: null });
  
  // Forms
  const [catForm, setCatForm] = useState({ id: null, name: '', type: 'expense', color: '#ef4444' });
  const [currForm, setCurrForm] = useState({ id: null, code: '', symbol: '', name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, currRes] = await Promise.all([
        axios.get(CATS_URL),
        axios.get(CURR_URL)
      ]);
      setCategories(catRes.data);
      setCurrencies(currRes.data);
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
        await axios.put(`${CATS_URL}/${catForm.id}`, catForm);
      } else {
        await axios.post(CATS_URL, catForm);
      }
      setShowCatModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save category', err);
    }
  };

  const handleDeleteCategory = async () => {
    try {
      if(deleteData.id) await axios.delete(`${CATS_URL}/${deleteData.id}`);
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
        await axios.put(`${CURR_URL}/${currForm.id}`, currForm);
      } else {
        await axios.post(CURR_URL, currForm);
      }
      setShowCurrModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save currency', err);
    }
  };

  const handleDeleteCurrency = async () => {
    try {
      if(deleteData.id) await axios.delete(`${CURR_URL}/${deleteData.id}`);
      setDeleteData({ type: null, id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete currency', err);
    }
  };

  return (
    <div className="space-y-8 mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Categories Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Budget Categories</h2>
            <button onClick={() => { setCatForm({ id: null, name: '', type: 'expense', color: '#ef4444' }); setShowCatModal(true); }} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
              + Add Category
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <div>
                    <p className="font-semibold text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{cat.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCatForm(cat); setShowCatModal(true); }} className="text-slate-400 hover:text-primary-600 text-sm">Edit</button>
                  <button onClick={() => setDeleteData({ type: 'category', id: cat.id, name: cat.name })} className="text-slate-400 hover:text-red-600 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Currencies Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Supported Currencies</h2>
            <button onClick={() => { setCurrForm({ id: null, code: '', symbol: '', name: '' }); setShowCurrModal(true); }} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
              + Add Currency
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {currencies.map(curr => (
              <div key={curr.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:border-slate-200">
                <div className="flex justify-start gap-4 items-center">
                  <div className="bg-slate-100 text-slate-700 font-bold w-10 h-10 rounded-lg flex items-center justify-center">
                    {curr.symbol}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{curr.code}</p>
                    <p className="text-xs text-slate-500">{curr.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCurrForm(curr); setShowCurrModal(true); }} className="text-slate-400 hover:text-primary-600 text-sm">Edit</button>
                  <button onClick={() => setDeleteData({ type: 'currency', id: curr.id, name: curr.name })} className="text-slate-400 hover:text-red-600 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{catForm.id ? 'Edit' : 'Add'} Category</h2>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={catForm.type} onChange={e => setCatForm({...catForm, type: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} className="w-full h-[42px] p-1 border border-slate-300 rounded-lg cursor-pointer" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{currForm.id ? 'Edit' : 'Add'} Currency</h2>
            <form onSubmit={handleSaveCurrency} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code (USD)</label>
                  <input required maxLength={3} value={currForm.code} onChange={e => setCurrForm({...currForm, code: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Symbol ($)</label>
                  <input required maxLength={5} value={currForm.symbol} onChange={e => setCurrForm({...currForm, symbol: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input required value={currForm.name} onChange={e => setCurrForm({...currForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. US Dollar" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCurrModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">Save</button>
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
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete {deleteData.type === 'category' ? 'Category' : 'Currency'}?</h3>
            <p className="text-slate-500 mb-6 font-medium">Are you sure you want to delete "{deleteData.name}"? This action cannot be undone and may affect associated transactions.</p>
            
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteData({ type: null, id: null, name: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex-1 font-medium">Cancel</button>
              <button onClick={deleteData.type === 'category' ? handleDeleteCategory : handleDeleteCurrency} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 font-medium shadow-sm border border-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
