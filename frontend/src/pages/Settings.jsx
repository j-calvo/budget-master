import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import SettingsData from '../components/SettingsData';
import { useTranslation } from 'react-i18next';

const CURR_URL = '/currencies';

export default function Settings() {
  const { t } = useTranslation();
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
    api.get(CURR_URL).then(res => setCurrencies(res.data)).catch(err => console.error(err));
  }, []);

  if (isLoading) return <div className="text-slate-500">Loading settings...</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 lg:pb-8">
      <h1 className="text-4xl font-serif text-white tracking-wide glow-text-white mb-1">{t('Global Settings')}</h1>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'preferences'
              ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
              : 'text-slate-400 hover:text-white bg-brand-900/40 border border-brand-600/30'
            }`}
        >
          {t('Localization & Format')}
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'data'
              ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
              : 'text-slate-400 hover:text-white bg-brand-900/40 border border-brand-600/30'
            }`}
        >
          {t('Data Management')}
        </button>
      </div>

      {activeTab === 'preferences' ? (
        <div className="glass-card p-8 mt-6 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none"></div>
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div>
              <h2 className="text-xl font-serif text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-5 bg-gold-500 rounded-full"></div>
                {t('Localization Preferences')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    {t('System Language')}
                  </label>
                  <select
                    value={formData.language}
                    onChange={e => setFormData({ ...formData, language: e.target.value })}
                    className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="en-US" className="bg-brand-800">English (US)</option>
                    <option value="es-ES" className="bg-brand-800">Spanish (Español)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2 font-serif italic">{t('Dictates date formats and UI translations')}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    {t('Default Display Currency')}
                  </label>
                  <select
                    value={formData.defaultCurrency}
                    onChange={e => setFormData({ ...formData, defaultCurrency: e.target.value })}
                    className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  >
                    {currencies.map(c => (
                      <option key={c.id} value={c.code} className="bg-brand-800">{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2 font-serif italic">{t('Used for aggregate dashboard numbers')}</p>
                </div>

              </div>
            </div>

            <div className="pt-6 border-t border-brand-600/30 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-gold px-8 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
              >
                {isSaving ? t('Saving...') : t('Save Preferences')}
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
