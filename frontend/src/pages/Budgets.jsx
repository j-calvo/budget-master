import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

const API_URL = 'http://localhost:5001/api/budgets';
const CATS_URL = 'http://localhost:5001/api/categories';

export default function Budgets() {
  const { settings } = useSettings();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '' });
  const [deleteData, setDeleteData] = useState({ id: null, name: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budRes, catRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(CATS_URL)
      ]);
      setBudgets(budRes.data);
      // Filter out income categories for budgeting
      const expCats = catRes.data.filter(c => c.type !== 'income');
      setCategories(expCats);
      if (expCats.length > 0) {
        setNewBudget(p => ({ ...p, categoryId: expCats[0].id }));
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
      await axios.post(API_URL, {
        categoryId: newBudget.categoryId,
        amount: parseFloat(newBudget.amount) || 0
      });
      setShowModal(false);
      setNewBudget(p => ({ ...p, amount: '' }));
      fetchData();
    } catch (err) {
      console.error('Failed to save budget', err);
    }
  };

  const handleDeleteBudget = async () => {
    try {
      if(deleteData.id) await axios.delete(`${API_URL}/${deleteData.id}`);
      setDeleteData({ id: null, name: null });
      fetchData();
    } catch (err) {
      console.error('Failed to delete budget', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(settings?.language || 'en-US', {
      style: 'currency',
      currency: settings?.defaultCurrency || 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Budgets</h1>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          + Create Budget
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 border-dashed text-center">
          <p className="text-slate-500 text-lg mb-4">No budgets set for this month.</p>
          <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map(budget => {
            const pct = Math.min(100, Math.round((budget.spent / budget.amount) * 100)) || 0;
            const isOver = budget.spent > budget.amount;
            const barColor = isOver ? 'bg-red-500' : (pct > 75 ? 'bg-yellow-500' : 'bg-primary-500');
            const textColor = isOver ? 'text-red-500' : 'text-slate-500';

            return (
              <div key={budget.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative group">
                <button 
                  onClick={() => setDeleteData({ id: budget.id, name: budget.category?.name })}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <div className="flex justify-between items-center mb-4 pr-6">
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1" title={budget.category?.name}>{budget.category?.name}</h3>
                  <span className={`text-sm font-medium whitespace-nowrap ml-2 ${textColor}`}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                  <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${pct}%` }}></div>
                </div>
                <p className={`text-xs text-right ${textColor}`}>
                  {isOver 
                    ? `Over budget by ${formatCurrency(budget.spent - budget.amount)}` 
                    : `${pct}% used`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Set Budget</h2>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select 
                  value={newBudget.categoryId} 
                  onChange={e => setNewBudget({...newBudget, categoryId: e.target.value})} 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Amount</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  value={newBudget.amount} 
                  onChange={e => setNewBudget({...newBudget, amount: e.target.value})} 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                  placeholder="0.00" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">Save Budget</button>
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
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Budget?</h3>
            <p className="text-slate-500 mb-6 font-medium">Are you sure you want to delete the "{deleteData.name}" budget? This action cannot be undone.</p>
            
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteData({ id: null, name: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex-1 font-medium">Cancel</button>
              <button onClick={handleDeleteBudget} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 font-medium shadow-sm border border-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
