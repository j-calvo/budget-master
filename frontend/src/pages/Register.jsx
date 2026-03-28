import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Register() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', inviteCode: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password, formData.inviteCode);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('Registration failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-brand-600/30 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-brand-900 border border-brand-600/50 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.1)] p-4 mb-4">
            <img src="/logo.svg" alt="Budget Master" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-[0.2em] text-white uppercase italic">{t('Budget Master')}</h1>
          <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent mt-3 opacity-60"></div>
        </div>

        <h2 className="text-xl font-medium text-slate-300 tracking-wide mb-6 text-center relative z-10">{t('Create Account')}</h2>
        
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm relative z-10">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-slate-400 text-sm mb-1 tracking-wide uppercase">{t('Name')}</label>
            <input 
              type="text" required
              className="w-full bg-brand-800/50 border border-brand-600/30 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none font-light"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1 tracking-wide uppercase">{t('Email')}</label>
            <input 
              type="email" required
              className="w-full bg-brand-800/50 border border-brand-600/30 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none font-light"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1 tracking-wide uppercase">{t('Password')}</label>
            <input 
              type="password" required
              className="w-full bg-brand-800/50 border border-brand-600/30 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none font-light"
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <div className="pt-2 border-t border-brand-600/30 mt-4">
            <label className="block text-slate-400 text-sm mb-1 tracking-wide uppercase">{t('Family Invite (Optional)')}</label>
            <input 
              type="text" placeholder={t('Got an invite?')}
              className="w-full bg-brand-800/50 border border-brand-600/30 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none placeholder:text-slate-500 font-light"
              value={formData.inviteCode} onChange={e => setFormData({...formData, inviteCode: e.target.value})} 
            />
            <p className="text-xs text-slate-400 mt-1 italic">{t('Leave empty to create a new Family Workspace.')}</p>
          </div>
          <button type="submit" className="w-full mt-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-brand-900 font-bold py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.5)]">
            {t('Create Account')}
          </button>
        </form>
        <p className="mt-6 text-center text-slate-400 text-sm relative z-10">
          {t('Already have an account?')} <Link to="/login" className="text-gold-400 hover:text-gold-300 transition-colors underline decoration-gold-400/30 underline-offset-4">{t('Sign in')}</Link>
        </p>
      </div>
    </div>
  );
}
