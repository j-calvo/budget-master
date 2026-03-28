import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import SettingsData from '../components/SettingsData';
import FamilySettings from '../components/FamilySettings';

const CURR_URL = '/currencies';

export default function Settings() {
  const { t } = useTranslation();
  const { settings, updateSettings, isLoading } = useSettings();
  const [activeTab, setActiveTab] = useState('preferences');
  const [formData, setFormData] = useState(settings || {
    defaultCurrency: 'USD',
    language: 'en-US',
    fontFamily: 'Outfit',
    budgetStartDay: 1,
    payFrequency: 'monthly',
    payDay: 15,
    payDay2: null,
    payDayOfWeek: null,
  });
  const [currencies, setCurrencies] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state once context loads
  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  useEffect(() => {
    api.get(CURR_URL).then(res => setCurrencies(res.data)).catch(err => console.error(err));
  }, []);

  if (isLoading) return <div className="text-slate-400">Loading settings...</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 lg:pb-8">
      <h1 className="text-4xl text-white tracking-wide glow-text-white mb-1">{t('Global Settings')}</h1>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'preferences'
              ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
              : 'text-slate-400 hover:text-white bg-brand-900/40 border border-brand-600/30'
            }`}
        >
          {t('Localization')}
        </button>
        <button
          onClick={() => setActiveTab('family')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'family'
              ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
              : 'text-slate-400 hover:text-white bg-brand-900/40 border border-brand-600/30'
            }`}
        >
          {t('Workspace')}
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'data'
              ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
              : 'text-slate-400 hover:text-white bg-brand-900/40 border border-brand-600/30'
            }`}
        >
          {t('Data')}
        </button>
      </div>

      {activeTab === 'preferences' ? (
        <div className="glass-card p-8 mt-6 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none"></div>
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div>
              <h2 className="text-xl text-white mb-6 flex items-center gap-2">
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
                    <option value="en-US" className="bg-brand-800">{t('English (US)')}</option>
                    <option value="es" className="bg-brand-800">{t('Spanish (LatAm)')}</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-2 italic">{t('Dictates date formats and UI translations')}</p>
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
                  <p className="text-xs text-slate-400 mt-2 italic">{t('Used for aggregate dashboard numbers')}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    {t('System Typography')}
                  </label>
                  <select
                    value={formData.fontFamily}
                    onChange={e => setFormData({ ...formData, fontFamily: e.target.value })}
                    className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="Outfit" className="bg-brand-800 font-outfit">Outfit (Modern)</option>
                    <option value="Inter" className="bg-brand-800 font-inter">Inter (Clean)</option>
                    <option value="Montserrat" className="bg-brand-800 font-montserrat">Montserrat (Classic)</option>
                    <option value="Playfair Display" className="bg-brand-800 font-serif">Playfair Display (Elegant)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-2 italic">{t('Choose a typeface that best suits your reading preference')}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    {t('Pay Frequency')}
                  </label>
                  <select
                    value={formData.payFrequency || 'monthly'}
                    onChange={e => setFormData({ ...formData, payFrequency: e.target.value })}
                    className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="monthly" className="bg-brand-800">{t('Monthly')}</option>
                    <option value="twice_monthly" className="bg-brand-800">{t('Twice a Month')}</option>
                    <option value="weekly" className="bg-brand-800">{t('Weekly')}</option>
                  </select>
                </div>

                {formData.payFrequency === 'weekly' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                      {t('Pay Day of Week')}
                    </label>
                    <select
                      value={formData.payDayOfWeek ?? 5}
                      onChange={e => setFormData({ ...formData, payDayOfWeek: parseInt(e.target.value) })}
                      className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer"
                    >
                      <option value={0} className="bg-brand-800">{t('Sunday')}</option>
                      <option value={1} className="bg-brand-800">{t('Monday')}</option>
                      <option value={2} className="bg-brand-800">{t('Tuesday')}</option>
                      <option value={3} className="bg-brand-800">{t('Wednesday')}</option>
                      <option value={4} className="bg-brand-800">{t('Thursday')}</option>
                      <option value={5} className="bg-brand-800">{t('Friday')}</option>
                      <option value={6} className="bg-brand-800">{t('Saturday')}</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-2 italic">{t('Used to align your liquidity forecast')}</p>
                  </div>
                ) : (
                  <div className={`grid ${formData.payFrequency === 'twice_monthly' ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                        {formData.payFrequency === 'twice_monthly' ? t('First Pay Day') : t('Preferred Pay Day')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.payDay}
                        onChange={e => setFormData({ ...formData, payDay: parseInt(e.target.value) })}
                        className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all"
                        placeholder="15"
                      />
                      {formData.payFrequency !== 'twice_monthly' && (
                        <p className="text-xs text-slate-400 mt-2 italic">{t('Used to align your liquidity forecast')}</p>
                      )}
                    </div>
                    {formData.payFrequency === 'twice_monthly' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                          {t('Second Pay Day')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.payDay2 || 28}
                          onChange={e => setFormData({ ...formData, payDay2: parseInt(e.target.value) })}
                          className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all"
                          placeholder="28"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    {t('Budget Start Day')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.budgetStartDay}
                    onChange={e => setFormData({ ...formData, budgetStartDay: parseInt(e.target.value) })}
                    className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all"
                    placeholder="1"
                  />
                  <p className="text-xs text-slate-400 mt-2 italic">{t('Define when your monthly budget period begins')}</p>
                </div>

              </div>
            </div>

            <div className="pt-6 border-t border-brand-600/30 flex justify-end items-center gap-4">
              {isSaved && <span className="text-emerald-400 text-sm font-medium transition-opacity duration-300">{t('Settings saved successfully!')}</span>}
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
      ) : activeTab === 'data' ? (
        <SettingsData />
      ) : (
        <FamilySettings />
      )}
    </div>
  );
}
