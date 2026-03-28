import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Users, Key, Trash2, Shield, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FamilySettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFamily = async () => {
    try {
      const res = await api.get('/family');
      setFamily(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  const rotateInviteCode = async () => {
    if (!window.confirm(t("Are you sure? Previous invite codes will securely expire."))) return;
    try {
      await api.post('/family/invite-code');
      fetchFamily();
    } catch (error) {
      console.error(error);
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm(t("Remove this member from the workspace?"))) return;
    try {
      await api.delete(`/family/members/${memberId}`);
      fetchFamily();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="text-gold-500 font-serif italic p-8 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">{t('Loading Workspace...')}</div>;
  if (!family) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="glass-panel p-5 md:glass-card md:p-8 rounded-2xl relative overflow-hidden group border border-brand-600/30">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-colors pointer-events-none"></div>
        <h2 className="text-xl md:text-2xl font-serif text-white mb-6 md:mb-8 flex items-center gap-2 relative z-10">
          <div className="w-1 h-5 bg-gold-500 rounded-full shrink-0"></div>
          {family.name}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10">
          <div className="bg-brand-900/40 p-5 rounded-2xl border border-brand-600/30">
            <h3 className="text-sm font-bold text-gold-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Key size={16} /> {t('Access Code')}
            </h3>
            <div className="flex items-center justify-between bg-brand-900/50 p-4 rounded-lg border border-brand-600/50">
              <span className="font-mono text-lg md:text-xl text-white tracking-widest break-all mr-2">{family.inviteCode}</span>
              {user.role === 'ADMIN' && (
                <button onClick={rotateInviteCode} className="text-xs text-gold-400 hover:text-white transition-colors uppercase tracking-wider font-bold bg-gold-500/10 hover:bg-gold-500/20 px-3 py-1.5 rounded">
                  {t('Rotate')}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-4 font-serif italic">{t('Share this code securely with family to join this workspace.')}</p>
          </div>

          <div className="bg-brand-900/40 p-5 rounded-2xl border border-brand-600/30 md:col-span-2">
            <h3 className="text-sm font-bold text-gold-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={16} /> {t('Workspace Members')}
            </h3>
            
            <div className="space-y-2 -mx-2 md:mx-0">
              {family.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 md:p-4 bg-transparent md:bg-brand-900/30 md:rounded-lg border-b border-brand-600/20 md:border-white/5 hover:bg-brand-800/40 transition-colors last:border-0 md:last:border-white/5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-700/50 border border-gold-500/20 flex items-center justify-center text-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.1)] shrink-0">
                      {member.role === 'ADMIN' ? <Shield size={18} /> : <User size={18} />}
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-white font-medium truncate">{member.user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{member.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${member.role === 'ADMIN' ? 'bg-gold-500/20 text-gold-400' : 'bg-brand-600/40 text-slate-300'}`}>
                      {t(member.role)}
                    </span>
                    
                    {user.role === 'ADMIN' && member.userId !== user.id && (
                      <button onClick={() => removeMember(member.userId)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title={t("Remove Member")}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
