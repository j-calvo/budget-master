import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Download, Trash2, RotateCcw, HardDrive, Shield, AlertTriangle } from 'lucide-react';

export default function SettingsBackup() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [backups, setBackups] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) fetchBackups();
  }, [isAdmin]);

  const fetchBackups = async () => {
    try {
      const res = await api.get('/backups');
      setBackups(res.data);
    } catch (err) {
      console.error('Failed to fetch backups', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setMessage(null);
    try {
      const res = await api.post('/backups');
      setMessage({ type: 'success', text: res.data.message });
      fetchBackups();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create backup' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (name) => {
    try {
      const res = await api.get(`/backups/${name}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download backup', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/backups/${deleteTarget}`);
      setDeleteTarget(null);
      setMessage({ type: 'success', text: t('Backup deleted successfully') });
      fetchBackups();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete backup' });
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      const res = await api.post(`/backups/${restoreTarget}/restore`);
      setRestoreTarget(null);
      setMessage({ type: 'success', text: res.data.message });
      fetchBackups();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to restore backup' });
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 mt-6 max-w-2xl mx-auto w-full pb-8">
        <div className="glass-card p-12 text-center border-brand-600/30">
          <Shield size={40} className="mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400 font-serif italic text-lg">{t('Admin access required')}</p>
          <p className="text-sm text-slate-500 mt-2">{t('Only workspace administrators can manage database backups.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 max-w-2xl mx-auto w-full pb-8">
      {/* Header card */}
      <div className="glass-card p-6 md:p-8 border-brand-600/30 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <HardDrive size={20} className="text-emerald-400" />
              </div>
              {t('Database Backups')}
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-md">{t('Create and manage snapshots of your financial data. Backups include all accounts, transactions, budgets, and settings.')}</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn-gold px-6 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50 shrink-0 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-brand-900 border-t-transparent animate-spin" />
                {t('Creating...')}
              </>
            ) : (
              <>
                <Shield size={14} />
                {t('Create Backup')}
              </>
            )}
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}
      </div>

      {/* Backup list */}
      <div className="glass-card overflow-hidden border-brand-600/30">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center">
            <HardDrive size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-serif italic">{t('No backups yet')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('Create your first backup to protect your data')}</p>
          </div>
        ) : (
          <div>
            <div className="hidden md:grid grid-cols-4 gap-4 px-6 py-3 border-b border-brand-600/50 bg-brand-900/40 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              <div className="col-span-2">{t('Backup')}</div>
              <div>{t('Size')}</div>
              <div className="text-right">{t('Actions')}</div>
            </div>

            <div className="divide-y divide-brand-600/30">
              {backups.map(backup => (
                <div key={backup.name} className="p-4 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-4 md:gap-4 md:items-center hover:bg-brand-600/10 transition-colors group">
                  <div className="col-span-2 flex items-center gap-3 min-w-0 mb-2 md:mb-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <HardDrive size={16} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{backup.name}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(backup.createdAt)}</p>
                    </div>
                  </div>

                  <div className="hidden md:block text-sm text-slate-400 font-mono">{formatSize(backup.size)}</div>

                  <div className="flex items-center justify-end gap-2 mt-2 md:mt-0">
                    <span className="md:hidden text-xs text-slate-500 font-mono mr-auto">{formatSize(backup.size)}</span>
                    <button
                      onClick={() => handleDownload(backup.name)}
                      className="p-2 text-slate-400 hover:text-gold-400 rounded-lg hover:bg-white/5 transition-colors"
                      title={t('Download')}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => setRestoreTarget(backup.name)}
                      className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-white/5 transition-colors"
                      title={t('Restore')}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(backup.name)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                      title={t('Delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setRestoreTarget(null)} />
          <div className="glass-panel relative w-full max-w-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300 border-amber-500/30">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <AlertTriangle size={36} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>
            <h3 className="text-2xl font-serif text-white mb-2">{t('Restore Database?')}</h3>
            <p className="text-sm text-slate-400 mb-2 leading-relaxed">{t('This will replace your current database with the selected backup. A safety backup of the current state will be created automatically.')}</p>
            <p className="text-xs text-amber-400 font-medium mb-6">{restoreTarget}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setRestoreTarget(null)} className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex-1 bg-brand-900/50 border border-brand-600/30 rounded-lg">{t('Cancel')}</button>
              <button onClick={handleRestore} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-brand-900 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex-1 shadow-[0_0_15px_rgba(245,158,11,0.4)]">{t('Restore')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="glass-panel relative w-full max-w-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300 border-rose-500/30">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <Trash2 size={36} className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            </div>
            <h3 className="text-2xl font-serif text-white mb-2">{t('Delete Backup?')}</h3>
            <p className="text-sm text-slate-400 mb-2">{t('This backup will be permanently deleted.')}</p>
            <p className="text-xs text-rose-400 font-medium mb-6">{deleteTarget}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setDeleteTarget(null)} className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex-1 bg-brand-900/50 border border-brand-600/30 rounded-lg">{t('Cancel')}</button>
              <button onClick={handleDelete} className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex-1 shadow-[0_0_15px_rgba(244,63,94,0.4)]">{t('Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
