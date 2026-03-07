import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

const API_URL = 'http://localhost:5001/api/transactions';
const ACCTS_URL = 'http://localhost:5001/api/accounts';
const CATS_URL = 'http://localhost:5001/api/categories';

export default function Transactions() {
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', date: '', description: '', accountId: '', categoryId: '', type: 'expense' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(ACCTS_URL),
        axios.get(CATS_URL)
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
      await axios.post(API_URL, {
        ...newTx,
        amount: parseFloat(newTx.amount) || 0
      });
      setShowModal(false);
      setNewTx(prev => ({ ...prev, amount: '', description: '', type: 'expense' }));
      fetchData();
    } catch (err) {
      console.error('Failed to create tx', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Transactions</h1>
        {accounts.length > 0 ? (
          <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            + New Transaction
          </button>
        ) : (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">Add an account first</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-600 grid grid-cols-5 gap-4">
          <div className="col-span-2">Description</div>
          <div>Category</div>
          <div>Date</div>
          <div className="text-right">Amount</div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No transactions found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 grid grid-cols-5 gap-4 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-2">
                  <p className="font-semibold text-slate-800">{tx.description}</p>
                  <p className="text-xs text-slate-500">{tx.account?.name}</p>
                </div>
                <div>
                  <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                    {tx.category?.name || 'Uncategorized'}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {new Date(tx.date).toLocaleDateString(settings?.language || 'en-US')}
                </div>
                <div className={`text-right font-bold ${tx.type === 'expense' ? 'text-slate-800' : 'text-green-600'}`}>
                  {tx.type === 'expense' ? '-' : '+'}
                  {new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: tx.account?.currency || settings?.defaultCurrency || 'USD' }).format(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add Transaction</h2>
            <form onSubmit={handleCreateTx} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button type="button" onClick={() => setNewTx({...newTx, type: 'expense'})} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${newTx.type === 'expense' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Expense</button>
                <button type="button" onClick={() => setNewTx({...newTx, type: 'income'})} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${newTx.type === 'income' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Income</button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input required type="number" step="0.01" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input required type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Weekly Groceries" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                <select value={newTx.accountId} onChange={e => setNewTx({...newTx, accountId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={newTx.categoryId} onChange={e => setNewTx({...newTx, categoryId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
