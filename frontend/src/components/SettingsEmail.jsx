import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';

export default function SettingsEmail() {
  const { t } = useTranslation();
  const [config, setConfig] = useState({ host: '', port: 993, secure: true, user: '', password: '', syncInterval: 15, isActive: false });
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ id: null, name: '', senderEmail: '', bodyRegex: '', currency: 'USD', amountGroup: 1, merchantGroup: 2, currencyGroup: '', cardGroup: '' });
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const cReq = await api.get('/settings/email-config');
      if (cReq.data && Object.keys(cReq.data).length > 0) {
        setConfig(prev => ({ ...prev, ...cReq.data, password: '' })); // password is empty unless changing
      }
      const rReq = await api.get('/settings/parsing-rules');
      if (rReq.data) setRules(rReq.data);
    } catch (e) {
      console.error(e);
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/email-config', config);
      alert(t('Email config saved'));
    } catch (e) {
      console.error(e);
      alert(t('Error saving config'));
    }
    setIsSaving(false);
  };

  const addRule = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...newRule, 
        currencyGroup: newRule.currencyGroup ? parseInt(newRule.currencyGroup) : null,
        cardGroup: newRule.cardGroup ? parseInt(newRule.cardGroup) : null 
      };
      // remove id from payload before sending
      delete payload.id;
      
      if (editingRuleId) {
        const res = await api.put(`/settings/parsing-rules/${editingRuleId}`, payload);
        setRules(rules.map(r => r.id === editingRuleId ? res.data : r));
        setEditingRuleId(null);
      } else {
        const res = await api.post('/settings/parsing-rules', payload);
        setRules([...rules, res.data]);
      }
      setNewRule({ id: null, name: '', senderEmail: '', bodyRegex: '', currency: 'USD', transactionType: 'expense', amountGroup: 1, merchantGroup: 2, currencyGroup: '', cardGroup: '' });
    } catch (e) {
      console.error(e);
      alert(t('Error saving rule'));
    }
  };

  const startEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setNewRule({
      id: rule.id,
      name: rule.name || '',
      senderEmail: rule.senderEmail || '',
      bodyRegex: rule.bodyRegex || '',
      currency: rule.currency || 'USD',
      transactionType: rule.transactionType || 'expense',
      amountGroup: rule.amountGroup || 1,
      merchantGroup: rule.merchantGroup || 2,
      currencyGroup: rule.currencyGroup || '',
      cardGroup: rule.cardGroup || ''
    });
    // Scroll down to the form
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setNewRule({ id: null, name: '', senderEmail: '', bodyRegex: '', currency: 'USD', transactionType: 'expense', amountGroup: 1, merchantGroup: 2, currencyGroup: '', cardGroup: '' });
  };

  const deleteRule = async (id) => {
    try {
      await api.delete(`/settings/parsing-rules/${id}`);
      setRules(rules.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="glass-card p-8 mt-6 relative overflow-hidden group">
      <h2 className="text-xl text-white mb-6 flex items-center gap-2">
        <div className="w-1 h-5 bg-gold-500 rounded-full"></div>
        {t('IMAP Email Configuration')}
      </h2>
      
      <form onSubmit={saveConfig} className="space-y-4 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('IMAP Host')}</label>
            <input type="text" value={config.host} onChange={e => setConfig({...config, host: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" placeholder="imap.gmail.com" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('Port')}</label>
            <input type="number" value={config.port} onChange={e => setConfig({...config, port: parseInt(e.target.value)})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('Username / Email')}</label>
            <input type="email" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('App Password')}</label>
            <input type="password" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" placeholder={t('Leave blank to keep existing')} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" checked={config.isActive} onChange={e => setConfig({...config, isActive: e.target.checked})} className="w-4 h-4" />
            <label className="text-sm text-white">{t('Enable Email Synchronization')}</label>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isSaving} className="btn-gold px-4 py-2 text-xs font-bold uppercase rounded">
            {isSaving ? t('Saving...') : t('Save Config')}
          </button>
        </div>
      </form>

      <h2 className="text-xl text-white mb-6 flex items-center gap-2 border-t border-brand-600/30 pt-6">
        <div className="w-1 h-5 bg-gold-500 rounded-full"></div>
        {t('Parsing Rules')}
      </h2>

      <div className="space-y-4 mb-8">
        {rules.map(r => (
          <div key={r.id} className="bg-brand-900/50 p-4 rounded border border-brand-600/30 flex justify-between items-center">
            <div>
              <p className="text-white font-bold">{r.name}</p>
              <p className="text-xs text-slate-400">{r.senderEmail} | Regex: {r.bodyRegex}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => startEditRule(r)} className="text-gold-400 hover:text-gold-300 text-xs uppercase font-bold">{t('Edit')}</button>
              <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold">{t('Delete')}</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-slate-400 text-sm italic">{t('No rules defined yet.')}</p>}
      </div>

      <form onSubmit={addRule} className={`bg-brand-900/30 p-4 rounded border ${editingRuleId ? 'border-gold-500/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-brand-600/30'} space-y-4 transition-all duration-300`}>
        <h3 className="text-white font-bold text-sm uppercase">{editingRuleId ? t('Edit Rule') : t('Add New Rule')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Rule Name')}</label>
             <input type="text" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" required />
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Sender Email')}</label>
             <input type="text" value={newRule.senderEmail} onChange={e => setNewRule({...newRule, senderEmail: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" placeholder="notificaciones@banco.com" required />
          </div>
          <div className="md:col-span-2">
             <label className="block text-xs text-slate-400 mb-1">{t('Body Regex')}</label>
             <input type="text" value={newRule.bodyRegex} onChange={e => setNewRule({...newRule, bodyRegex: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" placeholder="Monto: ([\\d,.]+).*?Comercio: (.*)" required />
             <p className="text-xs text-slate-400 mt-1">{t('Use capture groups () for Amount and Merchant.')}</p>
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Amount Group Index')}</label>
             <input type="number" value={newRule.amountGroup} onChange={e => setNewRule({...newRule, amountGroup: parseInt(e.target.value)})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" required min="1" />
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Merchant Group Index')}</label>
             <input type="number" value={newRule.merchantGroup} onChange={e => setNewRule({...newRule, merchantGroup: parseInt(e.target.value)})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" required min="1" />
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Currency Group Index')}</label>
             <input type="number" value={newRule.currencyGroup} onChange={e => setNewRule({...newRule, currencyGroup: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" placeholder={t('Optional')} min="1" />
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Card Group Index (Optional)')}</label>
             <input type="number" value={newRule.cardGroup} onChange={e => setNewRule({...newRule, cardGroup: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white" placeholder={t('Optional')} min="1" />
             <p className="text-xs text-slate-500 mt-1">{t('To auto-select credit card.')}</p>
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">{t('Transaction Type')}</label>
             <select value={newRule.transactionType} onChange={e => setNewRule({...newRule, transactionType: e.target.value})} className="w-full p-2 bg-brand-900/50 border border-brand-600/50 rounded text-white appearance-none cursor-pointer">
               <option value="expense" className="bg-brand-800">{t('Expense')}</option>
               <option value="income" className="bg-brand-800">{t('Income')}</option>
             </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {editingRuleId && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 text-xs font-bold uppercase rounded text-slate-400 hover:text-white transition-colors">{t('Cancel')}</button>
          )}
          <button type="submit" className="btn-gold px-4 py-2 text-xs font-bold uppercase rounded">{editingRuleId ? t('Save Changes') : t('Add Rule')}</button>
        </div>
      </form>
    </div>
  );
}
