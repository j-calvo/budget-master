import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../lib/currencyUtils';
import { useSettings } from '../context/SettingsContext';
import { 
  Calendar as CalendarIcon, 
  CreditCard, 
  Banknote, 
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export default function FinancialCalendar({ cards, loans, metrics, budgets = [], transactions = [] }) {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const daysInMonth = Array.from({ length: lastDayOfMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const payDays = useMemo(() => {
    const days = [];
    const lastDay = lastDayOfMonth;
    const { payFrequency = 'monthly', payDay: payDay1 = 15, payDay2 = 28, payDayOfWeek = 5 } = settings || {};

    if (payFrequency === 'monthly') {
      days.push(Math.min(payDay1, lastDay));
    } else if (payFrequency === 'twice_monthly') {
      days.push(Math.min(payDay1, lastDay));
      days.push(Math.min(payDay2, lastDay));
    } else if (payFrequency === 'weekly') {
      for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        if (dateObj.getDay() === payDayOfWeek) days.push(d);
      }
    }
    return [...new Set(days)].sort((a, b) => a - b);
  }, [settings, lastDayOfMonth, currentYear, currentMonth]);

  const events = useMemo(() => {
    const ev = {};
    const addEvent = (day, data) => {
      if (!ev[day]) ev[day] = [];
      ev[day].push(data);
    };

    payDays.forEach(pd => addEvent(pd, { 
      type: 'payday', label: t('Salary Payment'), icon: <Banknote className="w-3 h-3 text-emerald-400" />, color: 'emerald' 
    }));

    cards.forEach(card => {
      const isPaid = transactions.some(tx => 
        tx.creditCardId === card.id && 
        (tx.type === 'transfer' || tx.type === 'expense') && 
        new Date(tx.date).getMonth() === currentMonth &&
        new Date(tx.date).getFullYear() === currentYear
      );
      addEvent(card.dueDate, { 
        type: 'card', 
        label: card.name, 
        amount: card.balance, 
        currency: card.currency,
        isPaid,
        icon: <CreditCard className="w-3 h-3 text-gold-400" />,
        color: 'gold'
      });
    });

    loans.forEach(loan => {
      const loanDate = new Date(loan.nextDueDate);
      if (loanDate.getMonth() === currentMonth && loanDate.getFullYear() === currentYear) {
        const isPaid = loan.payments?.some(p => {
          const pDate = new Date(p.paymentDate);
          return p.type === 'installment' && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
        });
        addEvent(loanDate.getDate(), { 
          type: 'loan', 
          label: loan.name, 
          amount: loan.monthlyPayment, 
          currency: loan.currency,
          isPaid,
          icon: <Clock className="w-3 h-3 text-blue-400" />,
          color: 'blue'
        });
      }
    });

    budgets.forEach(budget => {
      if (budget.payDay) {
        const spent = parseFloat(budget.spent) || 0;
        const amount = parseFloat(budget.amount) || 0;
        const isFixed = budget.category?.type === 'fixed_expense';
        const isPaid = (spent >= amount && amount > 0) || (isFixed && spent > 0);
        addEvent(budget.payDay, { 
          type: 'budget', 
          label: budget.category?.name || 'Budget', 
          amount: budget.amount, 
          currency: budget.currency,
          isPaid,
          icon: <Banknote className="w-3 h-3 text-amber-400" />,
          color: 'amber'
        });
      }
    });

    return ev;
  }, [cards, loans, budgets, payDays, transactions, currentMonth, currentYear, t]);

  const selectedEvents = events[selectedDay] || [];

  return (
    <div className="glass-card p-6 min-h-[500px] flex flex-col md:flex-row gap-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -z-10 mix-blend-screen"></div>
      
      {/* Calendar Side */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif text-white tracking-tight">{t('Financial Calendar')}</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                {today.toLocaleString(settings?.language || 'en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-brand-800/50 text-slate-500 hover:text-white transition-colors cursor-not-allowed opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg bg-brand-800/50 text-slate-500 hover:text-white transition-colors cursor-not-allowed opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] uppercase tracking-widest text-slate-500 font-black py-2">{t(d)}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 flex-1">
          {blankDays.map(i => <div key={`blank-${i}`} className="aspect-square opacity-0"></div>)}
          {daysInMonth.map(day => {
            const isToday = day === currentDay;
            const isSelected = day === selectedDay;
            const dayEvents = events[day] || [];
            const hasUnpaid = dayEvents.some(ev => ev.amount > 0 && !ev.isPaid);
            const hasPaid = dayEvents.some(ev => ev.isPaid);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl md:rounded-2xl transition-all relative flex flex-col p-1.5 md:p-3 items-center md:items-start group
                  ${isSelected ? 'bg-gold-500/20 ring-1 ring-gold-500/50 shadow-[0_0_20px_rgba(212,175,55,0.15)] z-10' : 'bg-brand-900/40 hover:bg-brand-800/60'}
                  ${isToday ? 'border border-gold-500/40' : 'border border-brand-600/20'}
                `}
              >
                <span className={`text-xs md:text-sm font-medium ${isSelected ? 'text-gold-400' : (isToday ? 'text-gold-400 font-bold' : 'text-slate-400')}`}>
                  {day}
                </span>
                
                {/* Event Dots/Indicators */}
                <div className="mt-auto flex flex-wrap gap-1 justify-center md:justify-start">
                  {dayEvents.slice(0, 4).map((ev, i) => (
                    <div 
                      key={i} 
                      className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-sm
                        ${ev.isPaid ? 'bg-emerald-400 shadow-emerald-400/50' : 
                         ev.color === 'emerald' ? 'bg-emerald-400' : 
                         ev.color === 'gold' ? 'bg-gold-400' : 
                         ev.color === 'blue' ? 'bg-blue-400' : 'bg-slate-400'}
                      `}
                    />
                  ))}
                  {dayEvents.length > 4 && <div className="text-[8px] text-slate-500 font-bold leading-none">+{dayEvents.length - 4}</div>}
                </div>

                {isToday && <div className="absolute -top-1 -right-1 w-2 h-2 bg-gold-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(212,175,55,1)]"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Details Side */}
      <div className="w-full md:w-64 lg:w-80 flex flex-col pt-4 md:pt-0">
        <div className="bg-brand-900/40 rounded-3xl p-5 border border-brand-600/30 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-brand-800/80 flex items-center justify-center text-gold-400 font-serif italic text-xl">
              {selectedDay}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('Schedule for')}</p>
              <h3 className="text-white font-medium">{new Date(currentYear, currentMonth, selectedDay).toLocaleDateString(settings?.language || 'en-US', { day: 'numeric', month: 'long' })}</h3>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30 text-center py-8">
                <Info className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-sm font-serif italic text-slate-400">{t('No obligations for this day')}</p>
              </div>
            ) : (
              selectedEvents.map((ev, i) => (
                <div key={i} className={`p-3 rounded-2xl border transition-all flex items-center gap-3 relative group
                  ${ev.isPaid ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-brand-800/40 border-brand-600/30'}
                `}>
                  {ev.isPaid && <div className="absolute top-2 right-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /></div>}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                    ${ev.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 
                      ev.color === 'gold' ? 'bg-gold-500/10 text-gold-400' : 
                      ev.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}
                  `}>
                    {ev.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold tracking-tight truncate ${ev.isPaid ? 'text-emerald-400/70' : 'text-white'}`}>{ev.label}</p>
                    {ev.amount !== undefined && (
                      <p className={`text-[10px] font-mono mt-0.5 ${ev.isPaid ? 'text-emerald-400/50 line-through' : 'text-slate-400'}`}>
                        {formatCurrency(ev.amount, ev.currency, currencies, settings?.language)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-brand-600/30 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-tighter font-bold">
                <span className="text-slate-500">{t('Total for Day')}</span>
                <span className="text-white">
                  {formatCurrency(selectedEvents.reduce((sum, e) => sum + (e.amount || 0), 0), settings?.defaultCurrency, currencies, settings?.language)}
                </span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
