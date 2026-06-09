import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import SettingsData from '../components/SettingsData';
import SettingsBackup from '../components/SettingsBackup';
import FamilySettings from '../components/FamilySettings';
import SettingsEmail from '../components/SettingsEmail';
import AmountInput from '../components/AmountInput';

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
    // eslint-disable-next-line
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
    <div className="space-y-6 max-w-3xl mx-auto w-full pb-24 lg:pb-8">
      <h1 className="text-3xl md:text-4xl text-white tracking-wide glow-text-white mb-1 break-words leading-tight">{t('Global Settings')}</h1>

      <div className="flex bg-brand-900/60 p-1.5 rounded-2xl border border-brand-600/30 mb-8 shadow-inner max-w-lg mx-auto w-full overflow-x-auto custom-scrollbar relative z-10">
        {['preferences', 'family', 'email', 'data', 'backup'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-fit px-4 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-gold-500 text-brand-900 shadow-[0_4px_12px_rgba(212,175,55,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t(tab === 'preferences' ? 'Localization' : tab === 'family' ? 'Workspace' : tab === 'email' ? 'Email Sync' : tab === 'data' ? 'Data' : 'Backup')}
          </button>
        ))}
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

              {/* Theme Selector */}
              <div className="mb-8">
                <label className="block text-xs font-medium text-slate-400 mb-4 uppercase tracking-wider">
                  {t('Application Theme')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Emerald Wealth Card */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'emerald' })}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer ${
                      formData.theme === 'emerald' || !formData.theme
                        ? 'border-gold-500 bg-brand-700/60 shadow-[0_4px_20px_rgba(212,175,55,0.15)] ring-1 ring-gold-500'
                        : 'border-brand-600/30 bg-brand-900/30 hover:border-brand-600/60'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-serif font-bold text-foreground text-sm">{t('Emerald Wealth')}</span>
                      <div className="w-4 h-4 rounded-full border border-gold-500 flex items-center justify-center">
                        {(formData.theme === 'emerald' || !formData.theme) && <div className="w-2.5 h-2.5 rounded-full bg-gold-500"></div>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-[#050A07] border border-white/10" />
                      <div className="w-5 h-5 rounded-full bg-[#0B130E] border border-white/10" />
                      <div className="w-5 h-5 rounded-full bg-[#13221A] border border-white/10" />
                      <div className="w-5 h-5 rounded-full bg-[#D4AF37] border border-white/10" />
                    </div>
                  </button>

                  {/* Carbon High-Contrast Card */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'carbon' })}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer ${
                      formData.theme === 'carbon'
                        ? 'border-indigo-500 bg-brand-700/60 shadow-[0_4px_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500'
                        : 'border-brand-600/30 bg-brand-900/30 hover:border-brand-600/60'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-sans font-bold text-foreground text-sm">{t('Carbon Dark')}</span>
                      <div className="w-4 h-4 rounded-full border border-indigo-500 flex items-center justify-center">
                        {formData.theme === 'carbon' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-[#090D16] border border-white/10" />
                      <div className="w-5 h-5 rounded-full bg-[#0F172A] border border-white/10" />
                      <div className="w-5 h-5 rounded-full bg-[#1E293B] border border-white/10" />
                      <div className="w-5 h-5 rounded-full bg-[#6366F1] border border-white/10" />
                    </div>
                  </button>

                  {/* Alabaster Premium Card */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'alabaster' })}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer ${
                      formData.theme === 'alabaster'
                        ? 'border-[#854D0E] bg-brand-700/60 shadow-[0_4px_20px_rgba(133,77,14,0.15)] ring-1 ring-[#854D0E]'
                        : 'border-brand-600/30 bg-brand-900/30 hover:border-brand-600/60'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-sans font-bold text-foreground text-sm">{t('Alabaster Light')}</span>
                      <div className="w-4 h-4 rounded-full border border-[#854D0E] flex items-center justify-center">
                        {formData.theme === 'alabaster' && <div className="w-2.5 h-2.5 rounded-full bg-[#854D0E]"></div>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-[#F4F3EF] border border-black/10" />
                      <div className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-black/10" />
                      <div className="w-5 h-5 rounded-full bg-[#FFFFFF] border border-black/10" />
                      <div className="w-5 h-5 rounded-full bg-[#854D0E] border border-black/10" />
                    </div>
                  </button>
                </div>
              </div>

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
                    <option value="Outfit" className="bg-brand-800 font-outfit">{t('Outfit (Modern)')}</option>
                    <option value="Inter" className="bg-brand-800 font-inter">{t('Inter (Clean)')}</option>
                    <option value="Montserrat" className="bg-brand-800 font-montserrat">{t('Montserrat (Classic)')}</option>
                    <option value="Playfair Display" className="bg-brand-800 font-serif">{t('Playfair Display (Elegant)')}</option>
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
                      <AmountInput
                        value={formData.payDay}
                        onChange={e => setFormData({ ...formData, payDay: e.target.value })}
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
                        <AmountInput
                          value={formData.payDay2 || 28}
                          onChange={e => setFormData({ ...formData, payDay2: e.target.value })}
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
                  <AmountInput
                    value={formData.budgetStartDay}
                    onChange={e => setFormData({ ...formData, budgetStartDay: e.target.value })}
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
      ) : activeTab === 'backup' ? (
        <SettingsBackup />
      ) : activeTab === 'email' ? (
        <SettingsEmail />
      ) : (
        <FamilySettings />
      )}
    </div>
  );
}
