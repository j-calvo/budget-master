import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../lib/currencyUtils';
import AmountInput from '../components/AmountInput';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Zap, Upload, FileText, Calendar, DollarSign, Award, ChevronRight, Edit3, Trash2, CheckCircle, 
  AlertCircle, RefreshCw, Plus, X, Eye, Car
} from 'lucide-react';

const API_URL = '/service-consumption';

export default function Services() {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('utilities');
  
  // Utilities state
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // EV charging state
  const [evLogs, setEvLogs] = useState([]);
  const [isEvLoading, setIsEvLoading] = useState(true);
  const [showEvModal, setShowEvModal] = useState(false);
  const [editingEvLog, setEditingEvLog] = useState(null);
  const [evFormData, setEvFormData] = useState({
    date: '',
    billingPeriod: '',
    kwh: '',
    note: ''
  });
  
  // Modal states for Utilities
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    serviceType: 'electricity',
    provider: 'CNFL',
    nise: '',
    meterNumber: '',
    invoiceNumber: '',
    billingPeriod: '',
    readingDate: '',
    dueDate: '',
    previousReading: '',
    currentReading: '',
    consumption: '',
    unit: 'kWh',
    amount: '',
    currency: 'CRC',
    energyCost: '',
    publicLighting: '',
    tax: '',
    otherCharges: '',
    isPaid: false
  });

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchEvLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get(API_URL);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch service consumption logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvLogs = async () => {
    try {
      const res = await api.get('/ev-charging');
      setEvLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch EV logs:', err);
    } finally {
      setIsEvLoading(false);
    }
  };

  // ── Utility consumption Handlers ──
  const handleOpenAddModal = () => {
    setEditingLog(null);
    setFormData({
      serviceType: 'electricity',
      provider: 'CNFL',
      nise: logs[0]?.nise || '',
      meterNumber: logs[0]?.meterNumber || '',
      invoiceNumber: '',
      billingPeriod: '',
      readingDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      previousReading: '',
      currentReading: '',
      consumption: '',
      unit: 'kWh',
      amount: '',
      currency: 'CRC',
      energyCost: '',
      publicLighting: '',
      tax: '',
      otherCharges: '',
      isPaid: false
    });
    setUploadError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (log) => {
    setEditingLog(log);
    setFormData({
      serviceType: log.serviceType || 'electricity',
      provider: log.provider || 'CNFL',
      nise: log.nise || '',
      meterNumber: log.meterNumber || '',
      invoiceNumber: log.invoiceNumber || '',
      billingPeriod: log.billingPeriod || '',
      readingDate: log.readingDate ? new Date(log.readingDate).toISOString().split('T')[0] : '',
      dueDate: log.dueDate ? new Date(log.dueDate).toISOString().split('T')[0] : '',
      previousReading: log.previousReading !== null ? log.previousReading : '',
      currentReading: log.currentReading !== null ? log.currentReading : '',
      consumption: log.consumption !== null ? log.consumption : '',
      unit: log.unit || 'kWh',
      amount: log.amount !== null ? log.amount : '',
      currency: log.currency || 'CRC',
      energyCost: log.energyCost !== null ? log.energyCost : '',
      publicLighting: log.publicLighting !== null ? log.publicLighting : '',
      tax: log.tax !== null ? log.tax : '',
      otherCharges: log.otherCharges !== null ? log.otherCharges : '',
      isPaid: !!log.isPaid
    });
    setUploadError(null);
    setShowModal(true);
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this log?'))) return;
    try {
      await api.delete(`${API_URL}/${id}`);
      fetchLogs();
    } catch (err) {
      console.error('Failed to delete consumption log:', err);
    }
  };

  const handleTogglePaid = async (log) => {
    try {
      await api.put(`${API_URL}/${log.id}`, { isPaid: !log.isPaid });
      fetchLogs();
    } catch (err) {
      console.error('Failed to toggle paid status:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        previousReading: formData.previousReading !== '' ? parseFloat(formData.previousReading) : undefined,
        currentReading: formData.currentReading !== '' ? parseFloat(formData.currentReading) : undefined,
        consumption: parseFloat(formData.consumption),
        amount: parseFloat(formData.amount),
        energyCost: formData.energyCost !== '' ? parseFloat(formData.energyCost) : undefined,
        publicLighting: formData.publicLighting !== '' ? parseFloat(formData.publicLighting) : undefined,
        tax: formData.tax !== '' ? parseFloat(formData.tax) : undefined,
        otherCharges: formData.otherCharges !== '' ? parseFloat(formData.otherCharges) : undefined,
      };

      if (editingLog) {
        await api.put(`${API_URL}/${editingLog.id}`, payload);
      } else {
        await api.post(API_URL, payload);
      }

      setShowModal(false);
      fetchLogs();
    } catch (err) {
      console.error('Failed to save service consumption log:', err);
    }
  };

  // PDF Parser drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUploadAndParse(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleUploadAndParse(files[0]);
    }
  };

  const handleUploadAndParse = async (file) => {
    if (file.type !== 'application/pdf') {
      setUploadError(t('Please upload a valid PDF document.'));
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await api.post(`${API_URL}/parse`, uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const parsed = res.data;

      // Map parsed values into form state
      setFormData(prev => ({
        ...prev,
        invoiceNumber: parsed.invoiceNumber || '',
        nise: parsed.nise || prev.nise || '',
        billingPeriod: parsed.billingPeriod || '',
        readingDate: parsed.readingDate ? new Date(parsed.readingDate).toISOString().split('T')[0] : '',
        dueDate: parsed.dueDate ? new Date(parsed.dueDate).toISOString().split('T')[0] : '',
        previousReading: parsed.previousReading !== undefined && parsed.previousReading !== null ? parsed.previousReading.toString() : '',
        currentReading: parsed.currentReading !== undefined && parsed.currentReading !== null ? parsed.currentReading.toString() : '',
        consumption: parsed.consumption !== undefined && parsed.consumption !== null ? parsed.consumption.toString() : '',
        amount: parsed.amount !== undefined && parsed.amount !== null ? parsed.amount.toString() : '',
        energyCost: parsed.energyCost !== undefined && parsed.energyCost !== null ? parsed.energyCost.toString() : '',
        publicLighting: parsed.publicLighting !== undefined && parsed.publicLighting !== null ? parsed.publicLighting.toString() : '',
        tax: parsed.tax !== undefined && parsed.tax !== null ? parsed.tax.toString() : '',
        otherCharges: parsed.otherCharges !== undefined && parsed.otherCharges !== null ? parsed.otherCharges.toString() : '',
        isPaid: false
      }));

      setEditingLog(null);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to parse PDF invoice:', err);
      setUploadError(err.response?.data?.error || t('Error reading invoice. Please try manual entry.'));
    } finally {
      setIsUploading(false);
    }
  };

  // ── EV Charging Session Handlers ──
  const handleOpenAddEvModal = () => {
    setEditingEvLog(null);
    setEvFormData({
      date: new Date().toISOString().split('T')[0],
      billingPeriod: '',
      kwh: '',
      note: ''
    });
    setShowEvModal(true);
  };

  const handleOpenEditEvModal = (evLog) => {
    setEditingEvLog(evLog);
    setEvFormData({
      date: evLog.date ? new Date(evLog.date).toISOString().split('T')[0] : '',
      billingPeriod: evLog.billingPeriod || '',
      kwh: evLog.kwh !== null && evLog.kwh !== undefined ? evLog.kwh.toString() : '',
      note: evLog.note || ''
    });
    setShowEvModal(true);
  };

  const handleDeleteEvLog = async (id) => {
    if (!window.confirm(t('Are you sure you want to delete this EV session?'))) return;
    try {
      await api.delete(`/ev-charging/${id}`);
      fetchEvLogs();
    } catch (err) {
      console.error('Failed to delete EV log:', err);
    }
  };

  const handleEvSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: new Date(evFormData.date).toISOString(),
        billingPeriod: evFormData.billingPeriod,
        kwh: parseFloat(evFormData.kwh),
        note: evFormData.note || null
      };

      if (editingEvLog) {
        await api.put(`/ev-charging/${editingEvLog.id}`, payload);
      } else {
        await api.post('/ev-charging', payload);
      }

      setShowEvModal(false);
      fetchEvLogs();
    } catch (err) {
      console.error('Failed to save EV log:', err);
    }
  };

  const handleEvDateChange = (dateVal) => {
    if (!dateVal) return;
    const parts = dateVal.split('-'); // [YYYY, MM, DD]
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      setEvFormData(prev => ({
        ...prev,
        date: dateVal,
        billingPeriod: `${month}-${year}`
      }));
    } else {
      setEvFormData(prev => ({
        ...prev,
        date: dateVal
      }));
    }
  };

  // ── Metrics Calculation ──
  const stats = useMemo(() => {
    if (logs.length === 0) return { totalSpend: 0, totalKwh: 0, avgKwh: 0, avgRate: 0 };
    
    let totalSpend = 0;
    let totalKwh = 0;
    logs.forEach(log => {
      totalSpend += log.amount || 0;
      totalKwh += log.consumption || 0;
    });

    const avgKwh = totalKwh / logs.length;
    const avgRate = totalKwh > 0 ? totalSpend / totalKwh : 0;

    return { totalSpend, totalKwh, avgKwh, avgRate };
  }, [logs]);

  // ── Charts Data Preparation ──
  const chartData = useMemo(() => {
    return [...logs]
      .reverse() // Display chronological order (oldest to newest)
      .map(log => ({
        period: log.billingPeriod,
        consumption: log.consumption,
        amount: log.amount,
        rate: log.consumption > 0 ? parseFloat((log.amount / log.consumption).toFixed(2)) : 0
      }));
  }, [logs]);

  // Pie chart average breakdown of cost details
  const averageBreakdownData = useMemo(() => {
    if (logs.length === 0) return [];
    let count = 0;
    let totalEnergy = 0;
    let totalLighting = 0;
    let totalTax = 0;
    let totalOther = 0;

    logs.forEach(log => {
      if (log.energyCost || log.publicLighting || log.tax || log.otherCharges) {
        count++;
        totalEnergy += log.energyCost || 0;
        totalLighting += log.publicLighting || 0;
        totalTax += log.tax || 0;
        totalOther += log.otherCharges || 0;
      }
    });

    if (count === 0) return [];

    return [
      { name: t('Energy Cost'), value: Math.round(totalEnergy / count) },
      { name: t('Public Lighting'), value: Math.round(totalLighting / count) },
      { name: t('VAT (IVA)'), value: Math.round(totalTax / count) },
      { name: t('Firefighters Tax'), value: Math.round(totalOther / count) }
    ].filter(item => item.value > 0);
  }, [logs, t]);

  // ── EV Calculations ──
  const evSummaryByPeriod = useMemo(() => {
    const summary = {};
    evLogs.forEach(log => {
      const period = log.billingPeriod;
      if (!summary[period]) {
        summary[period] = { kwh: 0, sessions: 0 };
      }
      summary[period].kwh += log.kwh || 0;
      summary[period].sessions += 1;
    });
    return summary;
  }, [evLogs]);

  const evStats = useMemo(() => {
    let totalEvKwh = 0;
    let totalEvSessions = evLogs.length;
    let totalEstCost = 0;
    let shareSum = 0;
    let shareCount = 0;

    evLogs.forEach(log => {
      totalEvKwh += log.kwh || 0;
    });

    // Calculate estimated cost and share per period
    const periods = Object.keys(evSummaryByPeriod);
    periods.forEach(period => {
      const evKwh = evSummaryByPeriod[period].kwh;
      // Find electricity bill for this period
      const elecBill = logs.find(l => l.serviceType === 'electricity' && l.billingPeriod === period);
      if (elecBill && elecBill.consumption > 0) {
        const rate = elecBill.amount / elecBill.consumption;
        totalEstCost += evKwh * rate;
        shareSum += (evKwh / elecBill.consumption) * 100;
        shareCount += 1;
      }
    });

    const avgEvShare = shareCount > 0 ? shareSum / shareCount : 0;

    return { totalEvKwh, totalEvSessions, avgEvShare, totalEstCost };
  }, [evLogs, logs, evSummaryByPeriod]);

  const evAllocationChartData = useMemo(() => {
    const electricityBills = logs.filter(l => l.serviceType === 'electricity');
    return [...electricityBills]
      .reverse()
      .map(bill => {
        const period = bill.billingPeriod;
        const totalKwh = bill.consumption || 0;
        const evInfo = evSummaryByPeriod[period];
        const evKwh = evInfo ? evInfo.kwh : 0;
        const houseKwh = Math.max(0, totalKwh - evKwh);
        return {
          period,
          EV: evKwh,
          House: houseKwh,
        };
      });
  }, [logs, evSummaryByPeriod]);

  const evCostChartData = useMemo(() => {
    const electricityBills = logs.filter(l => l.serviceType === 'electricity');
    return [...electricityBills]
      .reverse()
      .map(bill => {
        const period = bill.billingPeriod;
        const totalBill = bill.amount || 0;
        const totalKwh = bill.consumption || 0;
        const evInfo = evSummaryByPeriod[period];
        const evKwh = evInfo ? evInfo.kwh : 0;
        const rate = totalKwh > 0 ? totalBill / totalKwh : 0;
        const evCost = evKwh * rate;
        return {
          period,
          evCost: parseFloat(evCost.toFixed(2)),
          totalBill,
        };
      });
  }, [logs, evSummaryByPeriod]);

  const PIE_COLORS = ['#d4af37', '#0ea5e9', '#f43f5e', '#a855f7'];

  // Tooltip Styles matching Analytics
  const tooltipStyle = {
    contentStyle: { 
      backgroundColor: 'rgba(15,23,42,0.9)', 
      backdropFilter: 'blur(12px)', 
      border: '1px solid rgba(212,175,55,0.2)', 
      borderRadius: '12px', 
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' 
    },
    itemStyle: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    labelStyle: { color: '#94a3b8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wide">
            {activeTab === 'utilities' ? t('Utility Consumption') : t('EV Charging Sessions')}
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            {activeTab === 'utilities'
              ? t('Track your household services and energy consumption')
              : t('Monitor your electric vehicle charging sessions and costs')}
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'utilities' ? (
            <>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-glass px-4 py-2 text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                disabled={isUploading}
              >
                {isUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-gold-400" />
                )}
                {t('Upload Invoice PDF')}
              </button>
              <button 
                onClick={handleOpenAddModal}
                className="btn-gold px-5 py-2 text-xs font-semibold shadow-md flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-brand-900" />
                {t('Add Service Log')}
              </button>
            </>
          ) : (
            <button 
              onClick={handleOpenAddEvModal}
              className="btn-gold px-5 py-2 text-xs font-semibold shadow-md flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-brand-900" />
              {t('Add EV Session')}
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="application/pdf" 
            className="hidden" 
          />
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-brand-600/30 gap-6">
        <button
          onClick={() => setActiveTab('utilities')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === 'utilities'
              ? 'text-gold-500 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('Utility Consumption')}
          {activeTab === 'utilities' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,1)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ev')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === 'ev'
              ? 'text-gold-500 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('EV Charging Sessions')}
          {activeTab === 'ev' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,1)]" />
          )}
        </button>
      </div>

      {/* ── Tab 1: Utility Consumption ── */}
      {activeTab === 'utilities' && (
        <>
          {/* PDF Upload & Drag Area */}
          {logs.length === 0 && !isLoading && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-card p-12 text-center border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group ${
                dragOver 
                  ? 'border-gold-500 bg-gold-500/5 shadow-[0_0_30px_rgba(212,175,55,0.1)]' 
                  : 'border-brand-600/30 hover:border-gold-500/30 hover:bg-brand-900/30'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center text-gold-400/60 mb-4 group-hover:scale-110 transition-transform shadow-inner">
                {isUploading ? (
                  <RefreshCw className="w-8 h-8 animate-spin text-gold-500" />
                ) : (
                  <Zap className="w-8 h-8 text-gold-400 group-hover:text-gold-300" />
                )}
              </div>
              <h3 className="text-lg font-serif italic text-white mb-2">
                {isUploading ? t('Parsing invoice...') : t('No service logs tracked yet.')}
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4">
                {t('Drag & drop your CNFL PDF invoice here, or click to browse')}
              </p>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest bg-brand-950/40 border border-brand-600/20 px-3 py-1 rounded-full">
                {t('CNFL Electricity Bills supported')}
              </span>
              {uploadError && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg max-w-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Error Banner if we already have logs */}
          {logs.length > 0 && uploadError && (
            <div className="flex items-center justify-between gap-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl max-w-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
            </div>
          ) : logs.length > 0 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl -z-10 group-hover:bg-gold-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Total Spent')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {formatCurrency(stats.totalSpend, 'CRC', currencies, settings?.language)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('All tracked logs')}</p>
                  </div>
                </div>

                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl -z-10 group-hover:bg-sky-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Total Energy Consumption')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {stats.totalKwh.toLocaleString(settings?.language || 'en-US')} <span className="text-sm font-sans font-medium text-slate-400">kWh</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('Accumulated electricity')}</p>
                  </div>
                </div>

                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -z-10 group-hover:bg-emerald-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Avg Monthly Consumption')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {Math.round(stats.avgKwh).toLocaleString(settings?.language || 'en-US')} <span className="text-sm font-sans font-medium text-slate-400">kWh</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('Average per bill')}</p>
                  </div>
                </div>

                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl -z-10 group-hover:bg-purple-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Avg Rate per kWh')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {formatCurrency(stats.avgRate, 'CRC', currencies, settings?.language)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('Average cost rate')}</p>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Monthly Consumption Trend (Bar) */}
                <div className="glass-card p-6 h-[380px] flex flex-col relative overflow-hidden group lg:col-span-2">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none transition-colors group-hover:bg-sky-500/10" />
                  <h2 className="text-lg font-serif text-white mb-6 relative z-10 flex items-center gap-2">
                    <div className="w-1 h-5 bg-sky-500 rounded-full" />
                    {t('Monthly Consumption (kWh)')}
                  </h2>
                  <div className="flex-1 min-h-0 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="consumptionG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={1} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, letterSpacing: '0.05em' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [`${v} kWh`, t('Consumption')]} {...tooltipStyle} />
                        <Bar name={t('Consumption')} dataKey="consumption" fill="url(#consumptionG)" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Average Bill Breakdown (Pie) */}
                <div className="glass-card p-6 h-[380px] flex flex-col relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none transition-colors group-hover:bg-gold-500/10" />
                  <h2 className="text-lg font-serif text-white mb-6 relative z-10 flex items-center gap-2">
                    <div className="w-1 h-5 bg-gold-500 rounded-full" />
                    {t('Cost breakdown')}
                  </h2>
                  <div className="flex-1 min-h-0 relative z-10">
                    {averageBreakdownData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={averageBreakdownData} cx="50%" cy="50%"
                            innerRadius={65} outerRadius={95}
                            paddingAngle={5} dataKey="value" stroke="none"
                          >
                            {averageBreakdownData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip 
                            formatter={(v) => [formatCurrency(v, 'CRC', currencies, settings?.language), 'Average']} 
                            contentStyle={{ 
                              backgroundColor: 'rgba(15,23,42,0.95)', 
                              backdropFilter: 'blur(12px)', 
                              border: '1px solid rgba(212,175,55,0.3)', 
                              borderRadius: '12px' 
                            }}
                            itemStyle={{ color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            labelStyle={{ display: 'none' }}
                          />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center"
                            wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex bg-brand-900/40 border border-brand-600/30 rounded-xl justify-center items-center h-full text-slate-500 font-serif italic shadow-inner text-sm">
                        {t('Upload your first PDF bill to auto-populate the data!')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost & Spending Trend (Line) - full width */}
                <div className="glass-card p-6 h-[340px] flex flex-col relative overflow-hidden group lg:col-span-3">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none transition-colors group-hover:bg-emerald-500/10" />
                  <h2 className="text-lg font-serif text-white mb-6 relative z-10 flex items-center gap-2">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    {t('Spending & Rate Trend')}
                  </h2>
                  <div className="flex-1 min-h-0 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip {...tooltipStyle} formatter={(value, name) => {
                          if (name === 'rate') return [`${formatCurrency(value, 'CRC', currencies, settings?.language)} / kWh`, t('Avg Rate per kWh')];
                          return [formatCurrency(value, 'CRC', currencies, settings?.language), t('Total Amount')];
                        }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', paddingTop: '15px' }} />
                        <Line yAxisId="left" name={t('Total Amount')} type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ r: 4, stroke: '#10b981', strokeWidth: 1 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" name={t('Avg Rate per kWh')} type="monotone" dataKey="rate" stroke="#a855f7" strokeWidth={2} dot={{ r: 4, stroke: '#a855f7', strokeWidth: 1 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Ledger Table */}
              <div className="glass-card overflow-hidden border border-brand-600/30">
                <div className="p-6 border-b border-brand-600/30 flex justify-between items-center bg-brand-900/10">
                  <h3 className="font-serif italic text-white text-lg tracking-wide">{t('History Ledger')}</h3>
                  <span className="px-2.5 py-1 bg-brand-900/50 border border-brand-600/40 text-gold-400 rounded-full text-xs font-mono">
                    {logs.length} {t('records')}
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-brand-600/20 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-brand-950/20">
                         <th className="py-4 px-6">{t('Billing Period')}</th>
                         <th className="py-4 px-6">{t('Consumption')}</th>
                         <th className="py-4 px-6">{t('Total Amount')}</th>
                         <th className="py-4 px-6">{t('Reading Date')}</th>
                         <th className="py-4 px-6">{t('Due Date')}</th>
                         <th className="py-4 px-6 text-center">{t('Status')}</th>
                         <th className="py-4 px-6 text-right">{t('Actions')}</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-brand-850/30">
                       {logs.map(log => {
                         const evInfo = log.serviceType === 'electricity' ? evSummaryByPeriod[log.billingPeriod] : null;
                         const evKwh = evInfo ? evInfo.kwh : 0;
                         const rate = log.consumption > 0 ? log.amount / log.consumption : 0;
                         const estEvCost = evKwh * rate;
                         const evSharePercent = log.consumption > 0 ? (evKwh / log.consumption) * 100 : 0;

                         return (
                           <tr key={log.id} className="hover:bg-brand-900/20 transition-colors group">
                             <td className="py-4 px-6 font-mono font-bold text-slate-200 text-sm">{log.billingPeriod}</td>
                             <td className="py-4 px-6 text-slate-200 text-sm font-medium">
                               {log.consumption.toLocaleString(settings?.language || 'en-US')} <span className="text-xs text-slate-500 font-normal">{log.unit}</span>
                               {evKwh > 0 && (
                                 <div className="text-[10px] text-gold-400 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in duration-300">
                                   <Car className="w-3.5 h-3.5" />
                                   <span>{evKwh.toLocaleString(settings?.language || 'en-US')} kWh EV ({evSharePercent.toFixed(1)}%)</span>
                                 </div>
                               )}
                             </td>
                             <td className="py-4 px-6 font-serif text-white text-base">
                               {formatCurrency(log.amount, log.currency, currencies, settings?.language)}
                               {estEvCost > 0 && (
                                 <div className="text-[10px] text-gold-400 font-semibold mt-1.5 animate-in fade-in duration-300">
                                   {t('Est. EV Cost')}: {formatCurrency(estEvCost, log.currency, currencies, settings?.language)}
                                 </div>
                               )}
                             </td>
                             <td className="py-4 px-6 text-slate-400 text-xs font-medium">
                               {log.readingDate ? new Date(log.readingDate).toLocaleDateString(settings?.language || 'en-US') : '-'}
                             </td>
                             <td className="py-4 px-6 text-slate-400 text-xs font-medium">
                               {log.dueDate ? new Date(log.dueDate).toLocaleDateString(settings?.language || 'en-US') : '-'}
                             </td>
                             <td className="py-4 px-6 text-center">
                               <button
                                 onClick={() => handleTogglePaid(log)}
                                 className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                   log.isPaid
                                     ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                     : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                 }`}
                               >
                                 {log.isPaid ? t('Paid') : t('Pending')}
                               </button>
                             </td>
                             <td className="py-4 px-6 text-right">
                               <div className="flex justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={() => handleOpenEditModal(log)} 
                                   className="text-slate-400 hover:text-gold-400 transition-colors p-1 active:scale-90"
                                   title={t('Edit')}
                                 >
                                   <Edit3 className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteLog(log.id)} 
                                   className="text-slate-400 hover:text-rose-400 transition-colors p-1 active:scale-90"
                                   title={t('Delete')}
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ── Tab 2: EV Charging Sessions ── */}
      {activeTab === 'ev' && (
        <>
          {/* Empty State */}
          {evLogs.length === 0 && !isEvLoading && (
            <div 
              onClick={handleOpenAddEvModal}
              className="glass-card p-12 text-center border border-brand-600/30 hover:border-gold-500/30 hover:bg-brand-900/30 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group"
            >
              <div className="w-16 h-16 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center text-gold-400/60 mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Car className="w-8 h-8 text-gold-400 group-hover:text-gold-300" />
              </div>
              <h3 className="text-lg font-serif italic text-white mb-2">
                {t('No EV charging sessions logged yet.')}
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4">
                {t('Track individual charging sessions to split costs from your electricity bills.')}
              </p>
              <button className="btn-gold px-5 py-2 text-xs font-semibold flex items-center gap-1">
                <Plus className="w-4 h-4 text-brand-900" />
                {t('Add EV Session')}
              </button>
            </div>
          )}

          {isEvLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 rounded-full border-t-2 border-gold-500 animate-spin"></div>
            </div>
          ) : evLogs.length > 0 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* EV Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl -z-10 group-hover:bg-gold-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Energy Charged (kWh)')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {evStats.totalEvKwh.toLocaleString(settings?.language || 'en-US')} <span className="text-sm font-sans font-medium text-slate-400">kWh</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('Accumulated charging')}</p>
                  </div>
                </div>

                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl -z-10 group-hover:bg-sky-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('EV Charging Sessions')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {evStats.totalEvSessions} <span className="text-sm font-sans font-medium text-slate-400">{t('sessions')}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('Total charges logged')}</p>
                  </div>
                </div>

                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -z-10 group-hover:bg-emerald-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Avg EV Share')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {evStats.avgEvShare.toFixed(1)} <span className="text-sm font-sans font-medium text-slate-400">%</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('of total electricity')}</p>
                  </div>
                </div>

                <div className="glass-card p-6 border-brand-600/30 relative overflow-hidden flex flex-col justify-between group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl -z-10 group-hover:bg-purple-500/10 transition-all"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('EV Estimated Cost')}</span>
                    <p className="text-3xl font-light font-serif text-white tracking-wide mt-2">
                      {formatCurrency(evStats.totalEstCost, 'CRC', currencies, settings?.language)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{t('Based on linked bills')}</p>
                  </div>
                </div>
              </div>

              {/* EV Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Stacked Energy Allocation (kWh) */}
                <div className="glass-card p-6 h-[360px] flex flex-col relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none transition-colors group-hover:bg-sky-500/10" />
                  <h2 className="text-lg font-serif text-white mb-6 relative z-10 flex items-center gap-2">
                    <div className="w-1 h-5 bg-gold-500 rounded-full" />
                    {t('Energy Allocation')} (kWh)
                  </h2>
                  <div className="flex-1 min-h-0 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evAllocationChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [`${v} kWh`]} {...tooltipStyle} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', paddingTop: '10px' }} />
                        <Bar name={t('EV Share')} dataKey="EV" stackId="a" fill="#d4af37" />
                        <Bar name={t('House (non-EV)')} dataKey="House" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Cost Trend */}
                <div className="glass-card p-6 h-[360px] flex flex-col relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none transition-colors group-hover:bg-gold-500/10" />
                  <h2 className="text-lg font-serif text-white mb-6 relative z-10 flex items-center gap-2">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    {t('EV Cost Trend')}
                  </h2>
                  <div className="flex-1 min-h-0 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evCostChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip {...tooltipStyle} formatter={(value, name) => {
                          if (name === 'evCost') return [formatCurrency(value, 'CRC', currencies, settings?.language), t('Est. EV Cost')];
                          return [formatCurrency(value, 'CRC', currencies, settings?.language), t('Total Bill')];
                        }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', paddingTop: '10px' }} />
                        <Line name={t('Est. EV Cost')} type="monotone" dataKey="evCost" stroke="#d4af37" strokeWidth={2.5} dot={{ r: 4 }} />
                        <Line name={t('Total Bill')} type="monotone" dataKey="totalBill" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* EV Charging Ledger */}
              <div className="glass-card overflow-hidden border border-brand-600/30">
                <div className="p-6 border-b border-brand-600/30 flex justify-between items-center bg-brand-900/10">
                  <h3 className="font-serif italic text-white text-lg tracking-wide">{t('History Ledger')}</h3>
                  <span className="px-2.5 py-1 bg-brand-900/50 border border-brand-600/40 text-gold-400 rounded-full text-xs font-mono">
                    {evLogs.length} {t('records')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-600/20 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-brand-950/20">
                        <th className="py-4 px-6">{t('Session Date')}</th>
                        <th className="py-4 px-6">{t('Billing Period')}</th>
                        <th className="py-4 px-6">{t('Energy Charged (kWh)')}</th>
                        <th className="py-4 px-6">{t('Est. EV Cost')}</th>
                        <th className="py-4 px-6">{t('Note (optional)')}</th>
                        <th className="py-4 px-6 text-right">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-850/30">
                      {evLogs.map(evLog => {
                        const elecBill = logs.find(log => log.serviceType === 'electricity' && log.billingPeriod === evLog.billingPeriod);
                        const rate = elecBill && elecBill.consumption > 0 ? elecBill.amount / elecBill.consumption : 0;
                        const estCost = evLog.kwh * rate;
                        const currency = elecBill ? elecBill.currency : 'CRC';

                        return (
                          <tr key={evLog.id} className="hover:bg-brand-900/20 transition-colors group">
                            <td className="py-4 px-6 text-slate-200 text-sm font-medium">
                              {evLog.date ? new Date(evLog.date).toLocaleDateString(settings?.language || 'en-US') : '-'}
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-slate-200 text-sm">{evLog.billingPeriod}</td>
                            <td className="py-4 px-6 text-slate-200 text-sm font-medium">
                              {evLog.kwh.toLocaleString(settings?.language || 'en-US')} <span className="text-xs text-slate-500 font-normal">kWh</span>
                            </td>
                            <td className="py-4 px-6 font-serif text-white text-base">
                              {estCost > 0 
                                ? formatCurrency(estCost, currency, currencies, settings?.language)
                                : '-'
                              }
                            </td>
                            <td className="py-4 px-6 text-slate-400 text-xs font-serif italic">{evLog.note || '-'}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleOpenEditEvLog(evLog)} 
                                  className="text-slate-400 hover:text-gold-400 transition-colors p-1 active:scale-90"
                                  title={t('Edit')}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteEvLog(evLog.id)} 
                                  className="text-slate-400 hover:text-rose-400 transition-colors p-1 active:scale-90"
                                  title={t('Delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Modal for Service logs ── */}
      {showModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-xl shadow-2xl border-white/10 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-white tracking-wide relative">
                {editingLog ? t('Edit Service Log') : t('Add Service Log')}
                <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parse PDF zone inside modal if creating a new one */}
            {!editingLog && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mb-6 p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  dragOver 
                    ? 'border-gold-500 bg-gold-500/5' 
                    : 'border-brand-600/30 hover:border-gold-500/30 hover:bg-brand-900/30'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium">
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-gold-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-gold-400" />
                  )}
                  <span>
                    {isUploading ? t('Parsing invoice...') : t('Upload a CNFL PDF invoice to autofill the form')}
                  </span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Group 1: General service details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Service Type')}</label>
                  <select 
                    value={formData.serviceType} 
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all appearance-none cursor-pointer text-sm"
                  >
                    <option value="electricity" className="bg-brand-800">{t('Electricity')}</option>
                    <option value="water" className="bg-brand-800">{t('Water')}</option>
                    <option value="gas" className="bg-brand-800">{t('Gas')}</option>
                    <option value="internet" className="bg-brand-800">{t('Internet')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Provider')}</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.provider} 
                    onChange={e => setFormData({ ...formData, provider: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-serif" 
                    placeholder="e.g. CNFL" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Billing Period')}</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.billingPeriod} 
                    onChange={e => setFormData({ ...formData, billingPeriod: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                    placeholder="e.g. 05-2026" 
                  />
                </div>
              </div>

              {/* Group 2: NISE, Meter and Invoice number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('NISE (Service ID)')}</label>
                  <input 
                    type="text" 
                    value={formData.nise} 
                    onChange={e => setFormData({ ...formData, nise: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                    placeholder="e.g. 28053358" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Meter Number')}</label>
                  <input 
                    type="text" 
                    value={formData.meterNumber} 
                    onChange={e => setFormData({ ...formData, meterNumber: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                    placeholder="e.g. 1266824" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Invoice Number')}</label>
                  <input 
                    type="text" 
                    value={formData.invoiceNumber} 
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                    placeholder="e.g. 117559317" 
                  />
                </div>
              </div>

              {/* Group 3: Readings & Consumption */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-brand-900/20 border border-brand-600/20 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Previous Meter Reading')}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.previousReading} 
                    onChange={e => setFormData({ ...formData, previousReading: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Current Meter Reading')}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.currentReading} 
                    onChange={e => setFormData({ ...formData, currentReading: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Consumption')}</label>
                  <div className="relative">
                    <input 
                      required
                      type="number" 
                      step="any"
                      value={formData.consumption} 
                      onChange={e => setFormData({ ...formData, consumption: e.target.value })} 
                      className="w-full pr-12 pl-2.5 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                      placeholder="0" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[10px] uppercase">{formData.unit}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Total Amount')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">¢</span>
                    <AmountInput 
                      required 
                      value={formData.amount} 
                      onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                      className="w-full pl-7 pr-3 py-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-serif" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Dates & Paid status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Reading Date')}</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.readingDate} 
                    onChange={e => setFormData({ ...formData, readingDate: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Due Date')}</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.dueDate} 
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
                    className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm" 
                  />
                </div>
                <div className="flex items-center gap-3 pt-4 sm:pt-6 pl-2">
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.isPaid} 
                      onChange={e => setFormData({ ...formData, isPaid: e.target.checked })} 
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-brand-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-500/80 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                  </label>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('Mark as Paid')}</span>
                </div>
              </div>

              {/* Group 5: Costs Breakdown Detail */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-brand-600/20 pb-1.5">{t('Cost breakdown')} ({t('Optional')})</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Energy Cost')}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">¢</span>
                      <AmountInput 
                        value={formData.energyCost} 
                        onChange={e => setFormData({ ...formData, energyCost: e.target.value })} 
                        className="w-full pl-6 pr-2 py-2 bg-brand-900/30 border border-brand-600/40 rounded-lg outline-none text-white transition-all text-xs font-serif" 
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Public Lighting')}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">¢</span>
                      <AmountInput 
                        value={formData.publicLighting} 
                        onChange={e => setFormData({ ...formData, publicLighting: e.target.value })} 
                        className="w-full pl-6 pr-2 py-2 bg-brand-900/30 border border-brand-600/40 rounded-lg outline-none text-white transition-all text-xs font-serif" 
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('VAT (IVA)')}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">¢</span>
                      <AmountInput 
                        value={formData.tax} 
                        onChange={e => setFormData({ ...formData, tax: e.target.value })} 
                        className="w-full pl-6 pr-2 py-2 bg-brand-900/30 border border-brand-600/40 rounded-lg outline-none text-white transition-all text-xs font-serif" 
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('Firefighters Tax')}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">¢</span>
                      <AmountInput 
                        value={formData.otherCharges} 
                        onChange={e => setFormData({ ...formData, otherCharges: e.target.value })} 
                        className="w-full pl-6 pr-2 py-2 bg-brand-900/30 border border-brand-600/40 rounded-lg outline-none text-white transition-all text-xs font-serif" 
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn-gold px-6 py-2 text-xs font-semibold cursor-pointer"
                >
                  {t('Save Log')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── EV Add / Edit Modal ── */}
      {showEvModal && (
        <div className="fixed inset-0 bg-brand-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card p-8 w-full max-w-md shadow-2xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -z-10 mix-blend-screen"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-white tracking-wide relative">
                {editingEvLog ? t('Edit EV Session') : t('Add EV Session')}
                <span className="absolute -bottom-2 left-0 w-12 h-[2px] bg-gold-500/50"></span>
              </h2>
              <button 
                onClick={() => setShowEvModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEvSubmit} className="space-y-5">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Session Date')}</label>
                <input 
                  required 
                  type="date" 
                  value={evFormData.date} 
                  onChange={e => handleEvDateChange(e.target.value)} 
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Billing Period')}</label>
                <input 
                  required 
                  type="text" 
                  value={evFormData.billingPeriod} 
                  onChange={e => setEvFormData({ ...evFormData, billingPeriod: e.target.value })} 
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                  placeholder="MM-YYYY (e.g. 05-2026)" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Energy Charged (kWh)')}</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  value={evFormData.kwh} 
                  onChange={e => setEvFormData({ ...evFormData, kwh: e.target.value })} 
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-mono" 
                  placeholder="0.00" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('Note (optional)')}</label>
                <input 
                  type="text" 
                  value={evFormData.note} 
                  onChange={e => setEvFormData({ ...evFormData, note: e.target.value })} 
                  className="w-full p-2.5 bg-brand-900/50 border border-brand-600/50 rounded-lg outline-none text-white transition-all text-sm font-serif" 
                  placeholder="e.g. trip to beach" 
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-brand-600/30">
                <button 
                  type="button" 
                  onClick={() => setShowEvModal(false)} 
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn-gold px-6 py-2 text-xs font-semibold cursor-pointer"
                >
                  {t('Save Log')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
