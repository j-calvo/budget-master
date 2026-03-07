import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import SettingsData from '../components/SettingsData';

const CURR_URL = 'http://localhost:5001/api/currencies';

export default function Settings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const [activeTab, setActiveTab] = useState('preferences');
  const [formData, setFormData] = useState(settings || {
    defaultCurrency: 'USD',
    language: 'en-US',
  });
  const [currencies, setCurrencies] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state once context loads
  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  useEffect(() => {
    axios.get(CURR_URL).then(res => setCurrencies(res.data)).catch(err => console.error(err));
  }, []);

  if (isLoading) return <div className="text-slate-500">Loading settings...</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-800">Global Settings</h1>
      
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('preferences')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'preferences' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Localization & Format
        </button>
        <button 
          onClick={() => setActiveTab('data')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'data' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Data Management
        </button>
      </div>

      {activeTab === 'preferences' ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Localization Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  System Language
                </label>
                <select 
                  value={formData.language} 
                  onChange={e => setFormData({...formData, language: e.target.value})} 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="ja-JP">Japanese</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Dictates date formats and UI translations (future rollout).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default Display Currency
                </label>
                <select 
                  value={formData.defaultCurrency} 
                  onChange={e => setFormData({...formData, defaultCurrency: e.target.value})} 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Used for aggregate dashboard numbers.</p>
              </div>

            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
      ) : (
        <SettingsData />
      )}
    </div>
  );
}
