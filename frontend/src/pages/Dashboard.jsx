import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const { settings, isLoading } = useSettings();

  if (isLoading) return <div>Loading dashboard...</div>;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(settings?.language || 'en-US', {
      style: 'currency',
      currency: settings?.defaultCurrency || 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
        Overview
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Net Worth</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(24500)}</p>
        </div>
        {/* Total Income */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Total Income (This Month)</p>
          <p className="text-3xl font-bold text-green-600 mt-2">+{formatCurrency(5200)}</p>
        </div>
        {/* Total Expenses */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Total Expenses (This Month)</p>
          <p className="text-3xl font-bold text-red-500 mt-2">-{formatCurrency(2150)}</p>
        </div>
        {/* Savings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Savings Rate</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">58%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Cash Flow</h2>
          <div className="flex items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            Chart Area: Income vs Expenses
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Transactions</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold">
                    G
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Groceries</p>
                    <p className="text-xs text-slate-500">Today, 2:30 PM</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">-{formatCurrency(120)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
