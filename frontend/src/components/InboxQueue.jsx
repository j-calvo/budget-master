import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';

export default function InboxQueue({ onActionComplete, categories, accounts, creditCards }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState([]);

  const fetchPending = async () => {
    try {
      const res = await api.get('/pending-transactions');
      setPending(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (txId, payload) => {
    try {
      await api.post(`/pending-transactions/${txId}/approve`, payload);
      fetchPending();
      if (onActionComplete) onActionComplete();
    } catch (e) {
      console.error(e);
      alert(t('Error approving transaction'));
    }
  };

  const handleDiscard = async (txId) => {
    try {
      await api.post(`/pending-transactions/${txId}/discard`);
      fetchPending();
    } catch (e) {
      console.error(e);
    }
  };

  if (pending.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-serif text-white tracking-wide">{t('Inbox Queue')}</h2>
        <span className="bg-gold-500 text-brand-900 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pending.map(tx => (
          <PendingCard 
            key={tx.id} 
            tx={tx} 
            categories={categories} 
            accounts={accounts} 
            creditCards={creditCards}
            onApprove={handleApprove}
            onDiscard={handleDiscard}
          />
        ))}
      </div>
    </div>
  );
}

function PendingCard({ tx, categories, accounts, creditCards, onApprove, onDiscard }) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [type, setType] = useState(tx.type || 'expense');
  const [description, setDescription] = useState(tx.merchantDescription);

  // Try to set default source based on first available
  useEffect(() => {
    if (!sourceId) {
      if (tx.cardLast4) {
        // Try to match the last 4 digits AND the exact currency to support Dual-Currency cards
        let matchedCard = creditCards.find(c => c.last4Digits === tx.cardLast4 && c.currency === tx.currency);
        
        // Fallback to just digits if currency mapping failed
        if (!matchedCard) {
          matchedCard = creditCards.find(c => c.last4Digits === tx.cardLast4);
        }

        if (matchedCard) {
          setSourceId(`card_${matchedCard.id}`);
        } else {
          // Look for an Account match
          let matchedAccount = accounts.find(a => a.last4Digits === tx.cardLast4 && a.currency === tx.currency);
          if (!matchedAccount) {
            matchedAccount = accounts.find(a => a.last4Digits === tx.cardLast4);
          }
          
          if (matchedAccount) {
            setSourceId(`account_${matchedAccount.id}`);
          } else if (creditCards.length > 0) {
            setSourceId(`card_${creditCards[0].id}`);
          } else if (accounts.length > 0) {
            setSourceId(`account_${accounts[0].id}`);
          }
        }
      } else if (creditCards.length > 0) {
        setSourceId(`card_${creditCards[0].id}`);
      } else if (accounts.length > 0) {
        setSourceId(`account_${accounts[0].id}`);
      }
    }
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [accounts, creditCards, categories, sourceId, categoryId, tx.cardLast4, tx.currency]);

  const approve = () => {
    if (!categoryId || !sourceId) {
      alert(t('Please select a category and source.'));
      return;
    }
    const isAcc = sourceId.startsWith('account_');
    const realSourceId = sourceId.replace(/^(account_|card_)/, '');

    onApprove(tx.id, {
      categoryId,
      accountId: isAcc ? realSourceId : null,
      creditCardId: !isAcc ? realSourceId : null,
      type,
      description
    });
  };

  return (
    <div className="glass-card p-4 border border-brand-600/30 flex flex-col gap-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold-500/80"></div>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
          <input 
            type="text" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full bg-transparent text-white font-medium focus:outline-none focus:border-b border-brand-600/30 focus:border-gold-500/50 pb-0.5 truncate transition-colors" 
            title={description} 
          />
          <div className="flex gap-2 items-center mt-1 text-slate-400 text-xs">
            <span>{new Date(tx.date).toLocaleDateString()}</span>
            {tx.cardLast4 && <span className="bg-brand-900 px-1.5 rounded text-gold-400/80 border border-brand-800 tracking-widest text-[10px]">•••• {tx.cardLast4}</span>}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <span className="font-serif text-gold-400 font-bold block">{tx.currency} {tx.amount}</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value)} className="w-1/3 p-1.5 text-xs bg-brand-900/50 border border-brand-600/50 rounded text-white appearance-none cursor-pointer">
          <option value="expense" className="bg-brand-800">{t('Expense')}</option>
          <option value="income" className="bg-brand-800">{t('Income')}</option>
        </select>
        <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-2/3 p-1.5 text-xs bg-brand-900/50 border border-brand-600/50 rounded text-white appearance-none cursor-pointer">
           {accounts.length > 0 && <optgroup label={t("Accounts")} className="bg-brand-900 text-gold-400">{accounts.map(a => <option value={`account_${a.id}`} key={`acc_${a.id}`} className="bg-brand-800 text-white">{a.name}</option>)}</optgroup>}
           {creditCards.length > 0 && <optgroup label={t("Credit Cards")} className="bg-brand-900 text-gold-400">{creditCards.map(c => <option value={`card_${c.id}`} key={`cc_${c.id}`} className="bg-brand-800 text-white">{c.name}</option>)}</optgroup>}
        </select>
      </div>

      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-1.5 text-xs bg-brand-900/50 border border-brand-600/50 rounded text-white appearance-none cursor-pointer">
        <option value="" disabled className="bg-brand-800">{t('Select Category')}</option>
        {categories.map(c => <option value={c.id} key={c.id} className="bg-brand-800">{c.name}</option>)}
      </select>

      <div className="flex justify-between items-center mt-2 border-t border-brand-600/30 pt-3">
        <button onClick={() => onDiscard(tx.id)} className="text-xs text-rose-400 uppercase font-bold hover:text-rose-300 transition-colors">{t('Discard')}</button>
        <button onClick={approve} className="bg-gold-500 text-brand-900 hover:bg-gold-400 text-xs font-bold uppercase px-3 py-1.5 rounded transition-colors shadow-md">{t('Approve & Save')}</button>
      </div>
    </div>
  );
}
