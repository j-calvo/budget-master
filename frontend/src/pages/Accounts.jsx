import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/accounts';
const CURR_URL = 'http://localhost:5001/api/currencies';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'Checking', institution: '', currency: 'USD', balance: 0 });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const [accRes, currRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(CURR_URL)
      ]);
      setAccounts(accRes.data);
      setCurrencies(currRes.data);
      if (currRes.data.length > 0 && !newAccount.currency) {
        setNewAccount(p => ({ ...p, currency: currRes.data[0].code }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, newAccount);
      setShowModal(false);
      setNewAccount({ name: '', type: 'Checking', institution: '', currency: 'USD', balance: 0 });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to create account', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Accounts</h1>
        <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          + Add Account
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 border-dashed text-center">
          <p className="text-slate-500 text-lg mb-4">No accounts added yet.</p>
          <button onClick={() => setShowModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{acc.name}</h3>
                  <p className="text-sm text-slate-500">{acc.institution || 'Bank'} • {acc.type}</p>
                </div>
                <div className="bg-primary-50 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency || 'USD' }).format(acc.balance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add New Account</h2>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                <input required type="text" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Chase Freedom" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Institution / Bank</label>
                <input type="text" value={newAccount.institution} onChange={e => setNewAccount({...newAccount, institution: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Chase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                <select value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option>Checking</option>
                  <option>Savings</option>
                  <option>Credit Card</option>
                  <option>Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select value={newAccount.currency} onChange={e => setNewAccount({...newAccount, currency: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  {currencies.map(c => (
                    <option key={c.id} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Starting Balance</label>
                <input type="number" step="0.01" value={newAccount.balance} onChange={e => setNewAccount({...newAccount, balance: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
