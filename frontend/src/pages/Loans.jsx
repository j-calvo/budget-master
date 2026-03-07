import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

const API_URL = 'http://localhost:5001/api/loans';
const CURR_URL = 'http://localhost:5001/api/currencies';

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
      const [lRes, cRes] = await Promise.all([axios.get(API_URL), axios.get(CURR_URL)]);
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
        axios.get(`${API_URL}/${loan.id}/schedule`),
        axios.get(`${API_URL}/${loan.id}/payments`),
      ]);
      setSchedule(sRes.data.schedule || []);
      setPayments(pRes.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const refreshDetail = async (loanId) => {
    try {
      const [lRes, sRes, pRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(`${API_URL}/${loanId}/schedule`),
        axios.get(`${API_URL}/${loanId}/payments`),
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
        await axios.put(`${API_URL}/${loanForm.id}`, loanForm);
      } else {
        await axios.post(API_URL, loanForm);
      }
      setShowLoanModal(false);
      await fetchAll();
      if (selectedLoan?.id === loanForm.id) await fetchDetail({ id: loanForm.id });
    } catch (e) { console.error(e); }
  };

  const handleDeleteLoan = async () => {
    try {
      await axios.delete(`${API_URL}/${deleteData.id}`);
      setDeleteData({ id: null, name: null });
      if (selectedLoan?.id === deleteData.id) setSelectedLoan(null);
      await fetchAll();
    } catch (e) { console.error(e); }
  };

  // ---- APR Update ----
  const handleUpdateAPR = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API_URL}/${selectedLoan.id}/apr`, { apr: parseFloat(newApr) });
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
      await axios.post(`${API_URL}/${selectedLoan.id}/payments`, paymentForm);
      setShowPaymentModal(false);
      setPaymentForm({ type: 'installment', amount: '', principal: '', interest: '', insuranceCost: '', paymentDate: todayStr(), notes: '' });
      await refreshDetail(selectedLoan.id);
    } catch (e) { console.error(e); }
  };

  const handleDeletePayment = async () => {
    try {
      await axios.delete(`${API_URL}/${selectedLoan.id}/payments/${deletePaymentData.id}`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Loans</h1>
        <button onClick={() => openLoanForm()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          + Add Loan
        </button>
      </div>

      {/* Loan cards */}
      {isLoading ? (
        <div className="text-slate-500">Loading loans...</div>
      ) : loans.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-200 text-center">
          <p className="text-slate-500 text-lg mb-4">No loans tracked yet.</p>
          <button onClick={() => openLoanForm()} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium">Add Your First Loan</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {loans.map(loan => {
            const remaining = calcRemaining(loan);
            const isSelected = selectedLoan?.id === loan.id;
            return (
              <div key={loan.id} onClick={() => fetchDetail(loan)}
                className={`bg-white p-5 rounded-xl shadow-sm border cursor-pointer group relative hover:border-primary-300 transition-all ${isSelected ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-100'}`}
              >
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); openLoanForm(loan); }} className="text-slate-300 hover:text-primary-600 p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteData({ id: loan.id, name: loan.name }); }} className="text-slate-300 hover:text-red-600 p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="pr-12 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{loan.name}</h3>
                    {loan.isVariableRate && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Variable</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {loan.interestRate}% APR • {loan.termMonths} mo term • Started {new Date(loan.startDate).toLocaleDateString(settings?.language || 'en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xl font-bold text-slate-800">{fmt(loan.balance, loan.currency)}</p>
                    <p className="text-xs text-slate-400">of {fmt(loan.originalBalance, loan.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary-600">{fmt(loan.monthlyPayment + loan.insuranceCost, loan.currency)}/mo</p>
                    {remaining !== null && <p className="text-xs text-slate-400">~{remaining} mo left</p>}
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                  <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, (1 - loan.balance / loan.originalBalance) * 100)).toFixed(1)}%` }} />
                </div>
                <p className="text-xs text-slate-400 text-right">{((1 - loan.balance / loan.originalBalance) * 100).toFixed(1)}% paid off</p>

                {isSelected && <p className="mt-2 text-center text-xs text-primary-600 font-medium">▼ Viewing details below</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selectedLoan && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">{selectedLoan.name}</h2>
                {selectedLoan.isVariableRate && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Variable APR: {selectedLoan.interestRate}%</span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Balance: <span className="font-semibold text-slate-700">{fmt(selectedLoan.balance, selectedLoan.currency)}</span>
                {' '}• Payment: <span className="font-semibold text-slate-700">{fmt(selectedLoan.monthlyPayment + selectedLoan.insuranceCost, selectedLoan.currency)}/mo</span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedLoan.isVariableRate && (
                <button onClick={() => { setNewApr(String(selectedLoan.interestRate)); setShowAprModal(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
                  Update APR
                </button>
              )}
              <button onClick={() => { prefillPayment('installment'); setShowPaymentModal(true); }}
                className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
                Register Installment
              </button>
              <button onClick={() => { prefillPayment('early_payment'); setShowPaymentModal(true); }}
                className="bg-slate-700 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
                Early Payment
              </button>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-slate-600 p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6">
            {['schedule', 'payments', 'apr_history'].map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${detailTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {tab === 'schedule' ? 'Amortization Schedule' : tab === 'payments' ? `Payment History (${payments.length})` : 'APR History'}
              </button>
            ))}
          </div>

          {/* Schedule */}
          {detailTab === 'schedule' && (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-right font-semibold">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Payment</th>
                    <th className="px-4 py-3 text-right font-semibold">Principal</th>
                    <th className="px-4 py-3 text-right font-semibold">Interest</th>
                    <th className="px-4 py-3 text-right font-semibold">Insurance</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedule.map((row, idx) => {
                    if (row.rowType === 'early_payment') {
                      return (
                        <tr key={`ep-${idx}`} className="bg-emerald-50">
                          <td colSpan={2} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Early Payment
                              </span>
                              <span className="text-xs text-slate-500">{row.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-700">−{fmt(row.principal, selectedLoan.currency)}</td>
                          <td className="px-4 py-2 text-right text-emerald-600">{fmt(row.principal, selectedLoan.currency)}</td>
                          <td className="px-4 py-2 text-right text-slate-400">—</td>
                          <td className="px-4 py-2 text-right text-slate-400">—</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-800">{fmt(row.balance, selectedLoan.currency)}</td>
                          <td className="px-4 py-2 text-right text-xs text-slate-400 italic">{row.notes}</td>
                        </tr>
                      );
                    }

                    // installment row
                    const paid = row.isPaid;
                    return (
                      <tr key={`inst-${row.month}`} className={`transition-colors ${paid ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                        <td className={`px-4 py-2.5 font-medium ${paid ? 'text-slate-400' : 'text-slate-500'}`}>{row.month}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{row.dueDate}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${paid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{fmt(row.payment, selectedLoan.currency)}</td>
                        <td className={`px-4 py-2.5 text-right ${paid ? 'text-slate-300' : 'text-emerald-600'}`}>{fmt(row.principal, selectedLoan.currency)}</td>
                        <td className={`px-4 py-2.5 text-right ${paid ? 'text-slate-300' : 'text-amber-600'}`}>{fmt(row.interest, selectedLoan.currency)}</td>
                        <td className={`px-4 py-2.5 text-right ${paid ? 'text-slate-300' : 'text-slate-500'}`}>{fmt(row.insurance, selectedLoan.currency)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{fmt(row.balance, selectedLoan.currency)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {paid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => openPayFromRow(row)}
                              className="text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1 rounded-full transition-colors whitespace-nowrap"
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
              {schedule.length === 0 && <p className="text-center py-8 text-slate-400">No schedule available</p>}
            </div>
          )}

          {/* Payment History */}
          {detailTab === 'payments' && (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>{['Date', 'Type', 'Total', 'Principal', 'Interest', 'Insurance', 'Notes', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-right first:text-left font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600">{new Date(p.paymentDate).toLocaleDateString(settings?.language || 'en-US')}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.type === 'installment' ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {p.type === 'installment' ? 'Installment' : 'Early Payment'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmt(p.amount, selectedLoan.currency)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">{fmt(p.principal, selectedLoan.currency)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600">{fmt(p.interest, selectedLoan.currency)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{fmt(p.insuranceCost, selectedLoan.currency)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400 text-xs max-w-[100px] truncate">{p.notes}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setDeletePaymentData({ id: p.id })} className="text-slate-300 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <p className="text-center py-8 text-slate-400">No payments registered yet.</p>}
            </div>
          )}

          {/* APR History */}
          {detailTab === 'apr_history' && (
            <div className="p-6">
              {selectedLoan.isVariableRate ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(selectedLoan.aprHistory || []).length === 0 && <p className="text-slate-400 text-sm">No APR history recorded.</p>}
                  {[...(selectedLoan.aprHistory || [])].reverse().map((entry, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2.5 text-sm">
                      <span className="text-slate-500">{new Date(entry.date).toLocaleDateString(settings?.language || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <span className="font-semibold text-slate-800">{entry.apr}% APR</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10M12 9v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="font-medium">This is a fixed-rate loan.</p>
                  <p className="text-sm">APR history is only tracked for variable-rate loans.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== Loan Form Modal ========== */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg my-8">
            <h2 className="text-2xl font-bold mb-5">{loanForm.id ? 'Edit' : 'Add'} Loan</h2>
            <form onSubmit={handleSaveLoan} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loan Name</label>
                <input required type="text" value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Home Mortgage" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loan Amount</label>
                  <input required type="number" step="0.01" min="0.01" value={loanForm.originalBalance} onChange={e => setLoanForm({ ...loanForm, originalBalance: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="200,000.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (% APR)</label>
                  <input required type="number" step="0.01" min="0" value={loanForm.interestRate} onChange={e => setLoanForm({ ...loanForm, interestRate: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="7.75" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term (Months)</label>
                  <input required type="number" min="1" value={loanForm.termMonths} onChange={e => setLoanForm({ ...loanForm, termMonths: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Cost / month</label>
                  <input type="number" step="0.01" min="0" value={loanForm.insuranceCost} onChange={e => setLoanForm({ ...loanForm, insuranceCost: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input required type="date" value={loanForm.startDate} onChange={e => setLoanForm({ ...loanForm, startDate: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select value={loanForm.currency} onChange={e => setLoanForm({ ...loanForm, currency: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    {currencies.map(c => <option key={c.id} value={c.code}>{c.code} ({c.symbol})</option>)}
                    {currencies.length === 0 && <option value="USD">USD ($)</option>}
                  </select>
                </div>
              </div>

              {/* Early payment strategy */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Early Payment Strategy</label>
                <select value={loanForm.earlyPaymentStrategy} onChange={e => setLoanForm({ ...loanForm, earlyPaymentStrategy: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="reduce_term">Reduce Term — keep same payment, finish sooner</option>
                  <option value="reduce_payment">Reduce Payment — same term, lower monthly payments</option>
                </select>
              </div>

              {/* Variable rate toggle */}
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <input type="checkbox" id="isVariableRate" checked={loanForm.isVariableRate} onChange={e => setLoanForm({ ...loanForm, isVariableRate: e.target.checked })} className="w-4 h-4 accent-amber-500" />
                <label htmlFor="isVariableRate" className="text-sm font-medium text-amber-800 cursor-pointer">
                  Variable Rate — APR can be updated over time without affecting past installments
                </label>
              </div>

              {/* Computed monthly payment preview */}
              {previewPayment !== null && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-primary-700 font-medium">Calculated Monthly Payment:</span>
                  <span className="text-lg font-bold text-primary-800">
                    {new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: loanForm.currency || 'USD' }).format(previewPayment + (parseFloat(loanForm.insuranceCost) || 0))}
                    <span className="text-xs ml-1 text-primary-600">/mo</span>
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLoanModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Update APR Modal ========== */}
      {showAprModal && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">Update Variable APR</h2>
            <p className="text-sm text-slate-500 mb-5">
              Loan: <span className="font-semibold text-slate-700">{selectedLoan.name}</span><br />
              Current APR: <span className="font-semibold text-amber-600">{selectedLoan.interestRate}%</span>
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
              ⚠️ This will update the APR going forward and recalculate the monthly payment. Already-registered installments are <strong>not affected</strong>.
            </div>
            <form onSubmit={handleUpdateAPR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New APR (%)</label>
                <input required type="number" step="0.01" min="0" value={newApr} onChange={e => setNewApr(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-lg font-semibold" placeholder="8.50" />
              </div>
              {newApr && (
                <div className="bg-slate-50 rounded-lg px-4 py-2.5 flex justify-between items-center text-sm">
                  <span className="text-slate-600">New monthly payment:</span>
                  <span className="font-bold text-slate-800">
                    {new Intl.NumberFormat(settings?.language || 'en-US', { style: 'currency', currency: selectedLoan.currency || 'USD' })
                      .format((calcMonthlyPayment(selectedLoan.balance, parseFloat(newApr), selectedLoan.termMonths) || 0) + selectedLoan.insuranceCost)}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAprModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg font-medium">Update APR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md my-8">
            <h2 className="text-2xl font-bold mb-1">
              {paymentForm.type === 'installment' ? 'Register Installment' : 'Register Early Payment'}
            </h2>
            <p className="text-sm text-slate-500 mb-5">Loan: <span className="font-semibold text-slate-700">{selectedLoan.name}</span></p>

            {/* Type toggle */}
            <div className="flex gap-2 mb-5">
              {[{ value: 'installment', label: 'Monthly Installment' }, { value: 'early_payment', label: 'Early Principal Payment' }].map(opt => (
                <button key={opt.value} type="button" onClick={() => prefillPayment(opt.value)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${paymentForm.type === opt.value ? 'bg-primary-600 text-white border-primary-600' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              {paymentForm.type === 'early_payment' ? (
                /* ---- Simplified early payment form ---- */
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
                    {selectedLoan.earlyPaymentStrategy === 'reduce_payment'
                      ? "💡 Enter the extra principal amount you're paying. This will reduce your loan balance and lower your future monthly payments (same term)."
                      : "💡 Enter the extra principal amount you're paying. This will reduce your loan balance immediately and shorten your remaining term."}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Extra Principal Amount</label>
                    <input required type="number" step="0.01" min="0.01"
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value, principal: e.target.value })}
                      className="w-full p-3 text-lg font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="50,000.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                    <input required type="date" value={paymentForm.paymentDate}
                      onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400">(optional)</span></label>
                    <input type="text" value={paymentForm.notes}
                      onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="e.g. Year-end bonus" />
                  </div>
                </>
              ) : (
                /* ---- Full installment form ---- */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
                      <input required type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Principal</label>
                      <input required type="number" step="0.01" value={paymentForm.principal} onChange={e => setPaymentForm({ ...paymentForm, principal: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Interest</label>
                      <input type="number" step="0.01" value={paymentForm.interest} onChange={e => setPaymentForm({ ...paymentForm, interest: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Insurance</label>
                      <input type="number" step="0.01" value={paymentForm.insuranceCost} onChange={e => setPaymentForm({ ...paymentForm, insuranceCost: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                    <input required type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400">(optional)</span></label>
                    <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. March payment" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm">
                  {paymentForm.type === 'installment' ? 'Register Installment' : 'Register Early Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Delete Loan Confirmation ========== */}
      {deleteData.id && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Loan?</h3>
            <p className="text-slate-500 mb-6 font-medium">Delete "{deleteData.name}" and all payment history? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteData({ id: null, name: null })} className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium">Cancel</button>
              <button onClick={handleDeleteLoan} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Delete Payment Confirmation ========== */}
      {deletePaymentData.id && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Remove Payment?</h3>
            <p className="text-slate-500 mb-6 font-medium">This will remove the payment entry and restore the principal to the loan balance.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePaymentData({ id: null })} className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium">Cancel</button>
              <button onClick={handleDeletePayment} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
