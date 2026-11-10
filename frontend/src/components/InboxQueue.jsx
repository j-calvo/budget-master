import React, { useState, useEffect } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { Globe, Percent } from 'lucide-react';

const DIGITAL_SERVICES_REGEX = /(steam|valve|playstation|psn|sony\s*inter|xbox|microsoft\*xbox|nintendo|netflix|spotify|disney|hbo|max\.com|apple\.com|itunes|google\s*\*(play|storage|services)|uber|airbnb|prime\s*video|amazon\s*digital|patreon|openai|chatgpt|dropbox|canva|crunchyroll)/i;

export default function InboxQueue({ onActionComplete, categories, accounts, creditCards }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState([]);
  const [ratesData, setRatesData] = useState(null);

  const fetchPending = async () => {
    try {
      const res = await api.get('/pending-transactions');
      setPending(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await api.get('/currencies/rates');
      setRatesData(res.data);
    } catch (e) {
      console.error('Failed to fetch exchange rates for inbox:', e);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchRates();
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
            ratesData={ratesData}
            onApprove={handleApprove}
            onDiscard={handleDiscard}
          />
        ))}
      </div>
    </div>
  );
}

function PendingCard({ tx, categories, accounts, creditCards, ratesData, onApprove, onDiscard }) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [type, setType] = useState(tx.type || 'expense');
  const [description, setDescription] = useState(tx.merchantDescription);
  const [convertedAmount, setConvertedAmount] = useState('');

  // Extra IVA state (auto-checked if matched as a known digital service)
  const isDigitalService = DIGITAL_SERVICES_REGEX.test(tx.merchantDescription || '') || DIGITAL_SERVICES_REGEX.test(tx.rawBody || '');
  const [extraIva, setExtraIva] = useState(isDigitalService);
  const [ivaCategoryId, setIvaCategoryId] = useState('');

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

  // Determine target currency
  const isAcc = sourceId.startsWith('account_');
  const realSourceId = sourceId.replace(/^(account_|card_)/, '');
  const selectedSource = isAcc
    ? accounts.find(a => a.id === realSourceId)
    : creditCards.find(c => c.id === realSourceId);

  const targetCurrency = selectedSource?.currency || 'USD';
  const txCurrency = tx.currency || 'USD';
  const isForeign = txCurrency.toUpperCase() !== targetCurrency.toUpperCase();

  // Calculate estimated converted amount when foreign
  useEffect(() => {
    if (!isForeign) {
      setConvertedAmount('');
      return;
    }

    if (ratesData?.rates) {
      const base = ratesData.base || 'USD';
      const rates = ratesData.rates;
      const amount = parseFloat(tx.amount) || 0;
      let est = amount;

      if (txCurrency === base && rates[targetCurrency]) {
        est = amount * rates[targetCurrency];
      } else if (targetCurrency === base && rates[txCurrency]) {
        est = amount / rates[txCurrency];
      } else if (rates[txCurrency] && rates[targetCurrency]) {
        est = (amount / rates[txCurrency]) * rates[targetCurrency];
      }
      setConvertedAmount(est.toFixed(2));
    } else {
      // Fallback: default 1:1 if rates not yet loaded
      setConvertedAmount(parseFloat(tx.amount || 0).toFixed(2));
    }
  }, [isForeign, tx.amount, txCurrency, targetCurrency, ratesData]);

  const baseAmount = parseFloat(tx.amount) || 0;
  const calculatedIvaAmount = parseFloat((baseAmount * 0.13).toFixed(2));
  const totalAmount = parseFloat((baseAmount + calculatedIvaAmount).toFixed(2));
  const convertedIvaAmount = isForeign && convertedAmount ? parseFloat((parseFloat(convertedAmount) * 0.13).toFixed(2)) : 0;
  const totalConvertedAmount = isForeign && convertedAmount ? parseFloat((parseFloat(convertedAmount) + convertedIvaAmount).toFixed(2)) : 0;

  const approve = () => {
    if (!categoryId || !sourceId) {
      alert(t('Please select a category and source.'));
      return;
    }

    const payload = {
      categoryId,
      accountId: isAcc ? realSourceId : null,
      creditCardId: !isAcc ? realSourceId : null,
      type,
      description
    };

    if (extraIva) {
      payload.extraIva = true;
      payload.ivaRate = 13;
      payload.ivaCategoryId = ivaCategoryId || categoryId;
    }

    if (isForeign) {
      const parsedConverted = parseFloat(convertedAmount) || tx.amount;
      payload.convertedAmount = parsedConverted;
      payload.originalAmount = tx.amount;
      payload.originalCurrency = txCurrency;
      payload.exchangeRate = tx.amount > 0 ? (parsedConverted / tx.amount) : 1;
      payload.settlementStatus = 'PENDING_SETTLEMENT';
      if (extraIva) {
        payload.ivaConvertedAmount = convertedIvaAmount;
        payload.ivaOriginalAmount = calculatedIvaAmount;
      }
    } else {
      payload.settlementStatus = 'SETTLED';
      if (extraIva) {
        payload.ivaAmount = calculatedIvaAmount;
      }
    }

    onApprove(tx.id, payload);
  };

  return (
    <div className="glass-card p-4 border border-brand-600/30 flex flex-col gap-3 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${isForeign ? 'bg-amber-500' : 'bg-gold-500/80'}`}></div>
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
           {accounts.length > 0 && <optgroup label={t("Accounts")} className="bg-brand-900 text-gold-400">{accounts.map(a => <option value={`account_${a.id}`} key={`acc_${a.id}`} className="bg-brand-800 text-white">{a.name} ({a.currency})</option>)}</optgroup>}
           {creditCards.length > 0 && <optgroup label={t("Credit Cards")} className="bg-brand-900 text-gold-400">{creditCards.map(c => <option value={`card_${c.id}`} key={`cc_${c.id}`} className="bg-brand-800 text-white">{c.name} ({c.currency})</option>)}</optgroup>}
        </select>
      </div>

      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-1.5 text-xs bg-brand-900/50 border border-brand-600/50 rounded text-white appearance-none cursor-pointer">
        <option value="" disabled className="bg-brand-800">{t('Select Category')}</option>
        {categories.map(c => <option value={c.id} key={c.id} className="bg-brand-800">{c.name}</option>)}
      </select>

      {/* Foreign currency preview & conversion helper */}
      {isForeign && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-amber-300 font-medium">
            <span className="flex items-center gap-1 text-[11px]">
              <Globe size={13} className="shrink-0" />
              {t('Foreign Currency')}
            </span>
            <span className="font-mono text-[11px]">{txCurrency} &rarr; {targetCurrency}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
            <span className="text-[11px] text-slate-300">{t('Est. Card Charge')}:</span>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-amber-400 font-bold">{targetCurrency}</span>
              <input
                type="number"
                step="0.01"
                value={convertedAmount}
                onChange={e => setConvertedAmount(e.target.value)}
                className="w-24 px-2 py-1 bg-brand-950/80 border border-amber-500/40 rounded text-right text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                placeholder="0.00"
              />
            </div>
          </div>
          <p className="text-[10px] text-amber-200/70 italic leading-snug">
            {t('Will be saved as Pending Settlement until your statement arrives.')}
          </p>
        </div>
      )}

      {/* Extra IVA (13%) section */}
      <div className="pt-1.5 border-t border-brand-600/30 space-y-2">
        <label className="flex items-center justify-between cursor-pointer group select-none">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={extraIva} 
              onChange={e => setExtraIva(e.target.checked)} 
              className="w-3.5 h-3.5 rounded border-brand-500 bg-brand-900 text-gold-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-gold-500"
            />
            <span className="text-xs text-slate-300 group-hover:text-white transition-colors flex items-center gap-1.5 font-medium">
              {t('Extra IVA (13%)')}
              {isDigitalService && (
                <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-normal" title={t('Digital service detected (13% IVA usually applies)')}>
                  {t('Digital Service')}
                </span>
              )}
            </span>
          </div>
          {extraIva && (
            <span className="text-xs font-serif text-gold-400 font-bold">
              +{tx.currency} {calculatedIvaAmount.toFixed(2)}
            </span>
          )}
        </label>

        {extraIva && (
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-xs space-y-1.5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-violet-300 font-medium text-[11px]">
              <span className="flex items-center gap-1">
                <Percent size={12} className="shrink-0" />
                {t('Two transactions will be created')}
              </span>
              <span className="font-mono text-violet-200 font-semibold">13%</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-violet-500/20 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">{t('Purchase')}</span>
                <span className="font-serif text-white font-medium">
                  {tx.currency} {baseAmount.toFixed(2)}
                  {isForeign && convertedAmount ? ` (~${targetCurrency} ${parseFloat(convertedAmount || 0).toFixed(2)})` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">{t('IVA (13%)')}</span>
                <span className="font-serif text-gold-400 font-bold">
                  +{tx.currency} {calculatedIvaAmount.toFixed(2)}
                  {isForeign && convertedIvaAmount ? ` (~${targetCurrency} ${convertedIvaAmount.toFixed(2)})` : ''}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-violet-500/20 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-300">{t('IVA Category')}:</span>
              <select 
                value={ivaCategoryId} 
                onChange={e => setIvaCategoryId(e.target.value)} 
                className="w-1/2 p-1 text-[11px] bg-brand-950/80 border border-violet-500/30 rounded text-white appearance-none cursor-pointer"
              >
                <option value="">{t('Same category')}</option>
                {categories.map(c => <option value={c.id} key={`iva_${c.id}`} className="bg-brand-900">{c.name}</option>)}
              </select>
            </div>

            <div className="pt-1 flex justify-between items-center text-[10px] text-violet-200/90 font-medium">
              <span>{t('Total charged to card')}:</span>
              <span className="font-serif text-gold-300 font-bold text-xs">
                {tx.currency} {totalAmount.toFixed(2)}
                {isForeign && convertedAmount ? ` (~${targetCurrency} ${totalConvertedAmount.toFixed(2)})` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 border-t border-brand-600/30 pt-3">
        <button onClick={() => onDiscard(tx.id)} className="text-xs text-rose-400 uppercase font-bold hover:text-rose-300 transition-colors">{t('Discard')}</button>
        <button onClick={approve} className="bg-gold-500 text-brand-900 hover:bg-gold-400 text-xs font-bold uppercase px-3 py-1.5 rounded transition-colors shadow-md">{t('Approve & Save')}</button>
      </div>
    </div>
  );
}
