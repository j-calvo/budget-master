import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';

const API_URL = '/loans';
const CURR_URL = '/currencies';

function todayStr() { return new Date().toISOString().slice(0, 10); }

/**
 * Client-side amortization formula for preview only
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function calcMonthlyPayment(principal, annualRatePercent, termMonths) {
  const p = parseFloat(principal);
  const r = parseFloat(annualRatePercent) / 100 / 12;
  const n = parseInt(termMonths);
  if (!p || !n || isNaN(p) || isNaN(n)) return null;
  if (!r || annualRatePercent === 0) return p / n;
  const pow = Math.pow(1 + r, n);
  return (p * r * pow) / (pow - 1);
}

const emptyLoanForm = (defaultCurrency) => ({
  id: null,
  name: '',
  originalBalance: '',
  interestRate: '',
  termMonths: 12,
  insuranceCost: 0,
  startDate: todayStr(),
  isVariableRate: false,
  earlyPaymentStrategy: 'reduce_term',
  currency: defaultCurrency || 'USD',
});

export default function Loans() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [loans, setLoans] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [deleteData, setDeleteData] = useState({ id: null, name: null });
  const [loanForm, setLoanForm] = useState(emptyLoanForm());

  // Detail panel
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [payments, setPayments] = useState([]);
  const [detailTab, setDetailTab] = useState('schedule');

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'installment', amount: '', principal: '', interest: '',
    insuranceCost: '', paymentDate: todayStr(), notes: '',
  });
  const [deletePaymentData, setDeletePaymentData] = useState({ id: null });

  // APR update modal (variable rate only)
  const [showAprModal, setShowAprModal] = useState(false);
  const [newApr, setNewApr] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [lRes, cRes] = await Promise.all([api.get(API_URL), api.get(CURR_URL)]);
      setLoans(lRes.data);
      setCurrencies(cRes.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchDetail = useCallback(async (loan) => {
    setSelectedLoan(loan);
    setDetailTab('schedule');
    try {
      const [sRes, pRes] = await Promise.all([
        api.get(`${API_URL}/${loan.id}/schedule`),
        api.get(`${API_URL}/${loan.id}/payments`),
      ]);
      setSchedule(sRes.data.schedule || []);
      setPayments(pRes.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const refreshDetail = async (loanId) => {
    try {
      const [lRes, sRes, pRes] = await Promise.all([
        api.get(API_URL),
        api.get(`${API_URL}/${loanId}/schedule`),
        api.get(`${API_URL}/${loanId}/payments`),
      ]);
      setLoans(lRes.data);
      setSchedule(sRes.data.schedule || []);
      setPayments(pRes.data || []);
      const updated = lRes.data.find(l => l.id === loanId);
      if (updated) setSelectedLoan(updated);
    } catch (e) { console.error(e); }
  };

  // ---- Loan CRUD ----
  const handleSaveLoan = async (e) => {
    e.preventDefault();
    try {
      if (loanForm.id) {
        await api.put(`${API_URL}/${loanForm.id}`, loanForm);
      } else {
        await api.post(API_URL, loanForm);
      }
      setShowLoanModal(false);
      await fetchAll();
      if (selectedLoan?.id === loanForm.id) await fetchDetail({ id: loanForm.id });
    } catch (e) { console.error(e); }
  };

  const handleDeleteLoan = async () => {
    try {
      await api.delete(`${API_URL}/${deleteData.id}`);
      setDeleteData({ id: null, name: null });
      if (selectedLoan?.id === deleteData.id) setSelectedLoan(null);
      await fetchAll();
    } catch (e) { console.error(e); }
  };

  // ---- APR Update ----
  const handleUpdateAPR = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`${API_URL}/${selectedLoan.id}/apr`, { apr: parseFloat(newApr) });
      setShowAprModal(false);
      setNewApr('');
      await refreshDetail(selectedLoan.id);
    } catch (e) { console.error(e); }
  };

  // Pre-fills payment form from an installment type
  const prefillPayment = (type) => {
    if (!selectedLoan) return;
    if (type === 'installment') {
      const r = selectedLoan.interestRate / 100 / 12;
      const interest = parseFloat((selectedLoan.balance * r).toFixed(2));
      const principal = parseFloat((selectedLoan.monthlyPayment - interest).toFixed(2));
      setPaymentForm(p => ({
        ...p, type,
        amount: (selectedLoan.monthlyPayment + selectedLoan.insuranceCost).toFixed(2),
        principal: Math.max(0, principal).toFixed(2),
        interest: interest.toFixed(2),
        insuranceCost: selectedLoan.insuranceCost.toFixed(2),
        paymentDate: todayStr(),
        notes: '',
      }));
    } else {
      // Early payment: just amount + date + notes; principal = amount
      setPaymentForm(p => ({
        ...p, type,
        amount: '',
        principal: '',
        interest: '0',
        insuranceCost: '0',
        paymentDate: todayStr(),
        notes: '',
      }));
    }
  };

  // Pre-fills payment form directly from a schedule row
  const openPayFromRow = (row) => {
    setPaymentForm({
      type: 'installment',
      amount: String(row.payment),
      principal: String(row.principal),
      interest: String(row.interest),
      insuranceCost: String(row.insurance),
      paymentDate: row.dueDate,
      notes: `Month ${row.month} installment`,
    });
    setShowPaymentModal(true);
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`${API_URL}/${selectedLoan.id}/payments`, paymentForm);
      setShowPaymentModal(false);
      setPaymentForm({ type: 'installment', amount: '', principal: '', interest: '', insuranceCost: '', paymentDate: todayStr(), notes: '' });
      await refreshDetail(selectedLoan.id);
    } catch (e) { console.error(e); }
  };

  const handleDeletePayment = async () => {
    try {
      await api.delete(`${API_URL}/${selectedLoan.id}/payments/${deletePaymentData.id}`);
      setDeletePaymentData({ id: null });
      await refreshDetail(selectedLoan.id);
    } catch (e) { console.error(e); }
  };

  // ---- Helpers ----
  const fmt = (amount, curr) =>
    new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: curr || 'USD' }).format(amount);

  const calcRemaining = (loan) =>
    loan.monthlyPayment > 0 ? Math.max(0, Math.ceil(loan.balance / loan.monthlyPayment)) : null;

  // Computed preview in loan form
  const previewPayment = calcMonthlyPayment(loanForm.originalBalance, loanForm.interestRate, loanForm.termMonths);

  const openLoanForm = (loan = null) => {
    setLoanForm(loan
      ? { ...loan, startDate: new Date(loan.startDate).toISOString().slice(0, 10) }
      : emptyLoanForm(currencies[0]?.code));
    setShowLoanModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">{t('Loans')}</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">{t('Manage your mortgages and structured debt')}</p>
        </div>
        <button onClick={() => openLoanForm()} className="btn-gold px-5 py-2 text-sm shadow-md flex items-center gap-1">
          <span className="text-lg leading-none">+</span> {t('Add Loan')}
        </button>
      </div>

      {/* Loan cards */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
        </div>
      ) : loans.length === 0 ? (
        <div className="glass-card p-16 text-center border border-dashed border-brand-600">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-600/30 flex items-center justify-center text-gold-400/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <p className="text-slate-400 font-serif italic text-lg mb-6">{t('No loans tracked yet.')}</p>
          <button onClick={() => openLoanForm()} className="btn-glass px-6 py-2">{t('Add Your First Loan')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loans.map(loan => {
            const remaining = calcRemaining(loan);
            const isSelected = selectedLoan?.id === loan.id;
            const progress = Math.max(0, Math.min(100, (1 - loan.balance / loan.originalBalance) * 100));
            
            return (
              <div key={loan.id} onClick={() => fetchDetail(loan)}
                className={`glass-card p-6 cursor-pointer relative group transition-all overflow-hidden ${isSelected ? 'border-gold-500/50 shadow-[0_0_30px_rgba(212,175,55,0.15)] ring-1 ring-gold-500/20' : 'hover:border-gold-500/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)]'}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl -z-10 mix-blend-screen transition-all group-hover:bg-gold-500/10"></div>

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); openLoanForm(loan); }} className="text-slate-400 hover:text-gold-400 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteData({ id: loan.id, name: loan.name }); }} className="text-slate-400 hover:text-rose-400 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="pr-16 mb-5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif italic text-white text-xl tracking-wide line-clamp-1">{loan.name}</h3>
                    {loan.isVariableRate && (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium uppercase tracking-widest whitespace-nowrap glow-text-amber">{t('Variable')}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider flex items-center gap-2">
                    <span className="text-gold-400">{loan.interestRate}% APR</span>
                    <span className="text-brand-600">•</span>
                    <span>{t('{{months}} mo term', { months: loan.termMonths })}</span>
                  </p>
                </div>

                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mb-1">{fmt(loan.balance, loan.currency)}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">{t('of')} {fmt(loan.originalBalance, loan.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm border border-gold-500/20 bg-gold-500/10 text-gold-400 px-3 py-1 rounded-md mb-1 font-medium">{fmt(loan.monthlyPayment + loan.insuranceCost, loan.currency)}/mo</p>
                    {remaining !== null && <p className="text-xs text-slate-400 uppercase tracking-wider">~{t('{{months}} mo left', { months: remaining })}</p>}
                  </div>
                </div>

                <div className="w-full bg-brand-900/50 rounded-full h-1.5 mb-2 overflow-hidden border border-brand-600/30">
                  <div className="bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)] h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 uppercase tracking-widest font-medium">
                  <span>{t('{{progress}}% paid', { progress: progress.toFixed(1) })}</span>
                  {isSelected && <span className="text-gold-400 flex items-center gap-1 animate-pulse">{t('Viewing details')} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selectedLoan && (
        <div className="glass-card overflow-hidden mt-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap justify-between items-center px-8 py-6 border-b border-brand-600/30 bg-brand-900/40 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-serif italic text-white tracking-wide">{selectedLoan.name}</h2>
                {selectedLoan.isVariableRate && (
                  <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium uppercase tracking-widest glow-text-amber">Variable APR: {selectedLoan.interestRate}%</span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <span>Balance: <span className="text-white ml-1">{fmt(selectedLoan.balance, selectedLoan.currency)}</span></span>
                <span className="text-brand-600">•</span>
                <span>Payment: <span className="text-white ml-1">{fmt(selectedLoan.monthlyPayment + selectedLoan.insuranceCost, selectedLoan.currency)}/mo</span></span>
              </p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {selectedLoan.isVariableRate && (
                <button onClick={() => { setNewApr(String(selectedLoan.interestRate)); setShowAprModal(true); }}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg font-medium transition-colors">
                  {t('Update APR')}
                </button>
              )}
              <button onClick={() => { prefillPayment('installment'); setShowPaymentModal(true); }}
                className="btn-gold px-4 py-2.5 text-xs">
                {t('Register Installment')}
              </button>
              <button onClick={() => { prefillPayment('early_payment'); setShowPaymentModal(true); }}
                className="bg-brand-800 hover:bg-brand-700 border border-brand-600 text-white text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg font-medium transition-colors">
                {t('Early Payment')}
              </button>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-white p-2 transition-colors ml-2 bg-brand-900 rounded-full border border-brand-600/50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-brand-600/30 px-8 bg-brand-900/20">
            {['schedule', 'payments', 'apr_history'].map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)}
                className={`px-5 py-3.5 text-xs font-medium uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${detailTab === tab ? 'border-gold-500 text-gold-400 glow-text-gold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                {tab === 'schedule' ? t('Amortization Schedule') : tab === 'payments' ? t('Payment History ({{count}})', { count: payments.length }) : t('APR History')}
              </button>
            ))}
          </div>

          {/* Schedule */}
          {detailTab === 'schedule' && (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar bg-brand-900/10">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-brand-900/60 text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-semibold border-b border-brand-600/30">#</th>
                    <th className="px-6 py-4 text-right font-semibold border-b border-brand-600/30">Date</th>
                    <th className="px-6 py-4 text-right font-semibold border-b border-brand-600/30">Payment</th>
                    <th className="px-6 py-4 text-right font-semibold border-b border-brand-600/30">Principal</th>
                    <th className="px-6 py-4 text-right font-semibold border-b border-brand-600/30">Interest</th>
                    <th className="px-6 py-4 text-right font-semibold border-b border-brand-600/30">Insurance</th>
                    <th className="px-6 py-4 text-right font-semibold border-b border-brand-600/30">Balance</th>
                    <th className="px-6 py-4 border-b border-brand-600/30"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-800/50">
                  {schedule.map((row, idx) => {
                    if (row.rowType === 'early_payment') {
                      return (
                        <tr key={`ep-${idx}`} className="bg-brand-800/20 hover:bg-brand-800/40 transition-colors">
                          <td colSpan={2} className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full glow-text-emerald">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Early Payment
                              </span>
                              <span className="text-xs text-slate-400">{row.date}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-400">−{fmt(row.principal, selectedLoan.currency)}</td>
                          <td className="px-6 py-4 text-right text-emerald-500">{fmt(row.principal, selectedLoan.currency)}</td>
                          <td className="px-6 py-4 text-right text-slate-400">—</td>
                          <td className="px-6 py-4 text-right text-slate-400">—</td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-300">{fmt(row.balance, selectedLoan.currency)}</td>
                          <td className="px-6 py-4 text-right text-xs text-slate-400 italic max-w-[120px] truncate">{row.notes}</td>
                        </tr>
                      );
                    }

                    // installment row
                    const paid = row.isPaid;
                    return (
                      <tr key={`inst-${row.month}`} className={`transition-colors ${paid ? 'bg-brand-900/30' : 'hover:bg-brand-800/40'}`}>
                        <td className={`px-6 py-4 font-medium ${paid ? 'text-slate-500' : 'text-slate-400'}`}>{row.month}</td>
                        <td className={`px-6 py-4 text-right font-mono text-xs ${paid ? 'text-slate-500' : 'text-slate-300'}`}>{row.dueDate}</td>
                        <td className={`px-6 py-4 text-right font-serif tracking-wide ${paid ? 'text-slate-500 line-through' : 'text-white font-medium'}`}>{fmt(row.payment, selectedLoan.currency)}</td>
                        <td className={`px-6 py-4 text-right ${paid ? 'text-slate-500' : 'text-emerald-400'}`}>{fmt(row.principal, selectedLoan.currency)}</td>
                        <td className={`px-6 py-4 text-right ${paid ? 'text-slate-500' : 'text-amber-400'}`}>{fmt(row.interest, selectedLoan.currency)}</td>
                        <td className={`px-6 py-4 text-right ${paid ? 'text-slate-500' : 'text-slate-400'}`}>{fmt(row.insurance, selectedLoan.currency)}</td>
                        <td className={`px-6 py-4 text-right font-serif ${paid ? 'text-slate-400' : 'text-slate-100'}`}>{fmt(row.balance, selectedLoan.currency)}</td>
                        <td className="px-6 py-4 text-right">
                          {paid ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => openPayFromRow(row)}
                              className="text-[10px] uppercase tracking-widest font-bold text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap glow-text-gold"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {schedule.length === 0 && <p className="text-center py-12 text-slate-400 font-serif italic">{t('No schedule available')}</p>}
            </div>
          )}

          {/* Payment History */}
          {detailTab === 'payments' && (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar bg-brand-900/10">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-brand-900/60 text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                  <tr>{['Date', 'Type', 'Total', 'Principal', 'Interest', 'Insurance', 'Notes', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-right first:text-left font-semibold border-b border-brand-600/30">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-brand-800/50">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-brand-800/40 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{new Date(p.paymentDate).toLocaleDateString(settings?.language || 'en-US')}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold border ${p.type === 'installment' ? 'bg-primary-900/40 text-primary-400 border-primary-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 glow-text-emerald'}`}>
                          {p.type === 'installment' ? 'Installment' : 'Early Payment'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-serif tracking-wide text-white">{fmt(p.amount, selectedLoan.currency)}</td>
                      <td className="px-6 py-4 text-right text-emerald-400">{fmt(p.principal, selectedLoan.currency)}</td>
                      <td className="px-6 py-4 text-right text-amber-400">{fmt(p.interest, selectedLoan.currency)}</td>
                      <td className="px-6 py-4 text-right text-slate-400">{fmt(p.insuranceCost, selectedLoan.currency)}</td>
                      <td className="px-6 py-4 text-right text-slate-400 text-xs max-w-[120px] truncate">{p.notes}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setDeletePaymentData({ id: p.id })} className="text-slate-400 hover:text-rose-400 transition-colors p-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <p className="text-center py-12 text-slate-400 font-serif italic">{t('No payments registered yet.')}</p>}
            </div>
          )}

          {/* APR History */}
          {detailTab === 'apr_history' && (
            <div className="p-8 bg-brand-900/10 min-h-[200px]">
              {selectedLoan.isVariableRate ? (
                 <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                  {(selectedLoan.aprHistory || []).length === 0 && <p className="text-slate-400 text-sm italic font-serif text-center mt-8">{t('No APR history recorded.')}</p>}
                  {[...(selectedLoan.aprHistory || [])].reverse().map((entry, i) => (
                    <div key={i} className="flex justify-between items-center bg-brand-900/40 border border-brand-600/30 rounded-lg px-5 py-3.5 text-sm hover:border-gold-500/30 transition-colors group">
                      <span className="text-slate-400 font-mono text-xs">{new Date(entry.date).toLocaleDateString(settings?.language || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <span className="font-bold text-gold-400 tracking-wider group-hover:glow-text-gold transition-all">{entry.apr}% APR</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-serif">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-900/40 border border-brand-600/30 flex items-center justify-center text-brand-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10M12 9v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-lg text-slate-300 mb-1">{t('Fixed-Rate Loan')}</p>
                  <p className="text-sm italic">{t('APR history is only tracked for variable-rate loans.')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== Loan Form Modal ========== */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto py-12 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-2xl shadow-2xl border-white/10 relative overflow-hidden my-auto">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-6 tracking-wide relative">
              {loanForm.id ? t('Edit') : t('Add')} {t('Loan')}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>

            <form onSubmit={handleSaveLoan} className="space-y-5">

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Loan Name')}</label>
                <input required type="text" value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif italic" placeholder="e.g. Home Mortgage" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Loan Amount')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                    <input required type="number" step="0.01" min="0.01" value={loanForm.originalBalance === 0 ? '' : loanForm.originalBalance} onChange={e => setLoanForm({ ...loanForm, originalBalance: e.target.value })} className="w-full pl-8 pr-3 py-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="200,000.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Interest Rate (% APR)')}</label>
                  <div className="relative">
                    <input required type="number" step="0.01" min="0" value={loanForm.interestRate === 0 ? '' : loanForm.interestRate} onChange={e => setLoanForm({ ...loanForm, interestRate: e.target.value })} className="w-full pr-8 pl-3 py-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="7.75" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Term (Months)')}</label>
                  <input required type="number" min="1" value={loanForm.termMonths || ''} onChange={e => setLoanForm({ ...loanForm, termMonths: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Insurance Cost / month')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                    <input type="number" step="0.01" min="0" value={loanForm.insuranceCost === 0 ? '' : loanForm.insuranceCost} onChange={e => setLoanForm({ ...loanForm, insuranceCost: e.target.value })} className="w-full pl-8 pr-3 py-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Start Date')}</label>
                  <input required type="date" value={loanForm.startDate} onChange={e => setLoanForm({ ...loanForm, startDate: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Currency')}</label>
                  <select value={loanForm.currency} onChange={e => setLoanForm({ ...loanForm, currency: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer">
                    {currencies.map(c => <option key={c.id} value={c.code} className="bg-brand-800">{c.code} ({c.symbol})</option>)}
                    {currencies.length === 0 && <option value="USD" className="bg-brand-800">USD ($)</option>}
                  </select>
                </div>
              </div>

              {/* Early payment strategy */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{t('Early Payment Strategy')}</label>
                <select value={loanForm.earlyPaymentStrategy} onChange={e => setLoanForm({ ...loanForm, earlyPaymentStrategy: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all appearance-none cursor-pointer text-sm">
                  <option value="reduce_term" className="bg-brand-800">Reduce Term — keep same payment, finish sooner</option>
                  <option value="reduce_payment" className="bg-brand-800">Reduce Payment — same term, lower monthly payments</option>
                </select>
              </div>

              {/* Variable rate toggle */}
              <div className="flex items-center gap-4 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 mt-2">
                <input type="checkbox" id="isVariableRate" checked={loanForm.isVariableRate} onChange={e => setLoanForm({ ...loanForm, isVariableRate: e.target.checked })} className="w-5 h-5 rounded border-amber-500/50 bg-brand-900/50 text-amber-500 focus:ring-amber-500/50 accent-amber-500 cursor-pointer" />
                <label htmlFor="isVariableRate" className="text-sm font-medium text-amber-500/90 cursor-pointer leading-relaxed">
                  Variable Rate — APR can be updated over time without affecting past installments
                </label>
              </div>

              {/* Computed monthly payment preview */}
              {previewPayment !== null && (
                <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl px-6 py-5 flex justify-between items-center mt-6">
                  <span className="text-xs uppercase tracking-widest text-gold-400/80 font-medium">Calculated Monthly Payment:</span>
                  <span className="text-2xl font-serif text-gold-400 glow-text-gold">
                    {new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: loanForm.currency || 'USD' }).format(previewPayment + (parseFloat(loanForm.insuranceCost) || 0))}
                    <span className="text-sm ml-1 text-gold-400/60 uppercase tracking-widest font-sans">/mo</span>
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-brand-600/30">
                <button type="button" onClick={() => setShowLoanModal(false)} className="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors uppercase tracking-wider">{t('Cancel')}</button>
                <button type="submit" className="btn-gold px-8 py-2.5 text-sm uppercase tracking-wider">{t('Save Loan')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Update APR Modal ========== */}
      {showAprModal && selectedLoan && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-sm shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            <h2 className="text-2xl font-serif text-white mb-2 tracking-wide relative">
              Update Variable APR
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-amber-500/50"></span>
            </h2>
            <p className="text-xs text-slate-400 mb-6 uppercase tracking-wider mt-5">
              Loan: <span className="font-medium text-white">{selectedLoan.name}</span><br />
              Current APR: <span className="font-bold text-amber-500 text-sm">{selectedLoan.interestRate}%</span>
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-xs text-amber-400/90 leading-relaxed shadow-inner">
              ⚠️ This will update the APR going forward and recalculate the monthly payment. Already-registered installments are <strong className="text-amber-300">not affected</strong>.
            </div>
            <form onSubmit={handleUpdateAPR} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">New APR (%)</label>
                <input required type="number" step="0.01" min="0" value={newApr} onChange={e => setNewApr(e.target.value)} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-white transition-all font-serif text-lg" placeholder="8.50" />
              </div>
              {newApr && (
                <div className="bg-brand-900/40 border border-brand-600/30 rounded-xl px-4 py-3 flex justify-between items-center text-sm shadow-inner">
                  <span className="text-xs text-slate-400 uppercase tracking-widest">New payment:</span>
                  <span className="font-serif text-amber-400 text-lg glow-text-amber">
                    {new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: selectedLoan.currency || 'USD' })
                      .format((calcMonthlyPayment(selectedLoan.balance, parseFloat(newApr), selectedLoan.termMonths) || 0) + selectedLoan.insuranceCost)}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-brand-600/30 mt-6">
                <button type="button" onClick={() => setShowAprModal(false)} className="px-5 py-2.5 text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-wider">Cancel</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(217,119,6,0.4)]">Update APR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Register Payment Modal ========== */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto py-12 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-lg shadow-2xl border-white/10 relative overflow-hidden my-auto">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
            
            <h2 className="text-2xl font-serif text-white mb-2 tracking-wide relative">
              {paymentForm.type === 'installment' ? 'Register Installment' : 'Register Early Payment'}
              <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
            </h2>
            <p className="text-xs text-slate-400 mb-8 uppercase tracking-wider mt-5">{t('Loan:')} <span className="font-medium text-white">{selectedLoan.name}</span></p>

            {/* Type toggle */}
            <div className="flex gap-3 mb-6 bg-brand-900/40 p-1.5 rounded-xl border border-brand-600/30">
              {[{ value: 'installment', label: 'Monthly Installment' }, { value: 'early_payment', label: 'Early Principal Payment' }].map(opt => (
                <button key={opt.value} type="button" onClick={() => prefillPayment(opt.value)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${paymentForm.type === opt.value ? 'bg-gold-500 text-brand-900 shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'text-slate-400 hover:text-white hover:bg-brand-800/50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-5">
              {paymentForm.type === 'early_payment' ? (
                /* ---- Simplified early payment form ---- */
                <>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 text-xs text-emerald-400/90 leading-relaxed shadow-inner">
                    {selectedLoan.earlyPaymentStrategy === 'reduce_payment'
                      ? "💡 Enter the extra principal amount you're paying. This will reduce your loan balance and lower your future monthly payments (same term)."
                      : "💡 Enter the extra principal amount you're paying. This will reduce your loan balance immediately and shorten your remaining term."}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Extra Principal Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-serif">$</span>
                      <input required type="number" step="0.01" min="0.01"
                        value={paymentForm.amount === 0 ? '' : paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value, principal: e.target.value })}
                        className="w-full pl-8 pr-4 py-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-emerald-400 transition-all text-xl font-serif glow-text-emerald"
                        placeholder="50,000.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Payment Date</label>
                    <input required type="date" value={paymentForm.paymentDate}
                      onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all font-serif [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Notes <span className="text-slate-500 font-normal lowercase">(optional)</span></label>
                    <input type="text" value={paymentForm.notes}
                      onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white transition-all font-serif italic"
                      placeholder="e.g. Year-end bonus" />
                  </div>
                </>
              ) : (
                /* ---- Full installment form ---- */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Total Amount</label>
                      <input required type="number" step="0.01" value={paymentForm.amount === 0 ? '' : paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Principal</label>
                      <input required type="number" step="0.01" value={paymentForm.principal === 0 ? '' : paymentForm.principal} onChange={e => setPaymentForm({ ...paymentForm, principal: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-emerald-400 transition-all font-serif" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Interest</label>
                      <input type="number" step="0.01" value={paymentForm.interest === 0 ? '' : paymentForm.interest} onChange={e => setPaymentForm({ ...paymentForm, interest: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-amber-400 transition-all font-serif" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Insurance</label>
                      <input type="number" step="0.01" value={paymentForm.insuranceCost === 0 ? '' : paymentForm.insuranceCost} onChange={e => setPaymentForm({ ...paymentForm, insuranceCost: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-slate-300 transition-all font-serif" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Payment Date</label>
                    <input required type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Notes <span className="text-slate-500 font-normal lowercase">(optional)</span></label>
                    <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full p-3 bg-brand-900/50 border border-brand-600/50 rounded-lg focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none text-white transition-all font-serif italic" placeholder="e.g. March payment" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-4 pt-6 mt-8 border-t border-brand-600/30">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-wider">Cancel</button>
                <button type="submit" className={paymentForm.type === 'installment' ? 'btn-gold px-8 py-2.5 text-xs uppercase tracking-wider' : 'bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(5,150,105,0.4)]'}>
                  {paymentForm.type === 'installment' ? 'Register Installment' : 'Register Early Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Delete Loan Confirmation ========== */}
      {deleteData.id && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-sm text-center border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-serif text-white mb-2 tracking-wide">{t('Delete Loan?')}</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t('Are you sure you want to delete "{{name}}" and all payment history? This cannot be undone.', { name: deleteData.name })}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteData({ id: null, name: null })} className="btn-glass px-4 py-2.5 flex-1 text-sm tracking-wide">Cancel</button>
              <button onClick={handleDeleteLoan} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-lg transition-colors flex-1 text-sm font-medium shadow-[0_0_15px_rgba(244,63,94,0.3)] tracking-wide">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Delete Payment Confirmation ========== */}
      {deletePaymentData.id && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-sm text-center border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-serif text-white mb-2 tracking-wide">Remove Payment?</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t('This will remove the payment entry and restore the principal to the loan balance.')}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeletePaymentData({ id: null })} className="btn-glass px-4 py-2.5 flex-1 text-sm tracking-wide">Cancel</button>
              <button onClick={handleDeletePayment} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-lg transition-colors flex-1 text-sm font-medium shadow-[0_0_15px_rgba(244,63,94,0.3)] tracking-wide">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
