import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../lib/currencyUtils';
import { useSettings } from '../context/SettingsContext';
import { 
  Calendar, 
  CreditCard, 
  Banknote, 
  ArrowRightLeft, 
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function FinancialTimeline({ cards, loans, metrics, budgets = [] }) {
  const { t } = useTranslation();
  const { settings, currencies } = useSettings();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const payFrequency = settings?.payFrequency || 'monthly';
  const payDay1 = settings?.payDay || 15;
  const payDay2 = settings?.payDay2 || 28;
  const payDayOfWeek = settings?.payDayOfWeek ?? 5;

  const payDays = useMemo(() => {
    const days = [];
    if (payFrequency === 'monthly') {
      days.push(Math.min(payDay1, lastDayOfMonth));
    } else if (payFrequency === 'twice_monthly') {
      days.push(Math.min(payDay1, lastDayOfMonth));
      days.push(Math.min(payDay2, lastDayOfMonth));
    } else if (payFrequency === 'weekly') {
      for (let d = 1; d <= lastDayOfMonth; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        if (dateObj.getDay() === payDayOfWeek) {
          days.push(d);
        }
      }
    }
    // Remove duplicates (e.g., if payDay1 == payDay2 somehow) and sort
    return [...new Set(days)].sort((a, b) => a - b);
  }, [payFrequency, payDay1, payDay2, payDayOfWeek, lastDayOfMonth, currentYear, currentMonth]);
  const daysInMonth = Array.from({ length: lastDayOfMonth }, (_, i) => i + 1);

  // Identify important days
  const events = useMemo(() => {
    const ev = {};
    
    // Pay Days
    payDays.forEach(pd => {
      ev[pd] = ev[pd] || [];
      ev[pd].push({ type: 'payday', label: t('Pay Day'), icon: <Banknote className="w-4 h-4 text-emerald-400" /> });
    });

    // Credit Card Due Dates
    cards.forEach(card => {
      ev[card.dueDate] = ev[card.dueDate] || [];
      ev[card.dueDate].push({ 
        type: 'card', 
        label: `${card.name}`, 
        amount: card.balance, 
        currency: card.currency,
        icon: <CreditCard className="w-4 h-4 text-gold-400" /> 
      });
    });

    // Loan Due Dates
    loans.forEach(loan => {
      const loanDate = new Date(loan.nextDueDate);
      if (loanDate.getMonth() === today.getMonth() && loanDate.getFullYear() === today.getFullYear()) {
        const day = loanDate.getDate();
        ev[day] = ev[day] || [];
        ev[day].push({ 
          type: 'loan', 
          label: `${loan.name}`, 
          amount: loan.monthlyPayment, 
          currency: loan.currency,
          icon: <Clock className="w-4 h-4 text-blue-400" /> 
        });
      }
    });

    // Budget Paydays
    budgets.forEach(budget => {
      if (budget.payDay) {
        ev[budget.payDay] = ev[budget.payDay] || [];
        ev[budget.payDay].push({ 
          type: 'budget', 
          label: `${budget.category?.name || 'Budget'} Payday`, 
          amount: budget.amount, 
          currency: budget.currency,
          icon: <Banknote className="w-4 h-4 text-gold-400" /> 
        });
      }
    });

    return ev;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, loans, budgets, payDays, t, currentMonth, currentYear]);

  // Calculate liquidity forecast
  // "Bills due before next payday"
  const nextPayDay = useMemo(() => {
    return payDays.find(d => d > currentDay) || (lastDayOfMonth + 1);
  }, [payDays, currentDay, lastDayOfMonth]);

  const billsBeforePayday = useMemo(() => {
    let total = 0;
    
    // This is a simplified calculation for the UI
    Object.keys(events).forEach(day => {
      const d = parseInt(day);
      if (d >= currentDay && d < nextPayDay) {
        events[day].forEach(e => {
          if (e.type === 'card' || e.type === 'loan') {
            // We'd ideally convert here, but for UI we assume base currency if it's just a forecast
            total += e.amount || 0;
          }
        });
      }
    });
    return total;
  }, [events, currentDay, nextPayDay]);

  const isLiquidityLow = metrics?.netWorth < billsBeforePayday;

  const formatC = (amount, currencyCode) => {
    return formatCurrency(amount, currencyCode || settings?.defaultCurrency || 'USD', currencies, settings?.language);
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 mix-blend-screen transition-colors group-hover:bg-emerald-500/10"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-serif text-white tracking-wide flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gold-500" />
            {t('Payment Timeline')}
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
            {today.toLocaleString(settings?.language || 'en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className={`px-4 py-2 rounded-xl flex items-center gap-3 border ${isLiquidityLow ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
          {isLiquidityLow ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('Liquidity Forecast')}</p>
            <p className={`text-sm font-serif ${isLiquidityLow ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isLiquidityLow ? t('Low funds for upcoming bills') : t('Safe to Spend')}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Area (Responsive grid/wrap instead of horizontal scroll) */}
      <div className="w-full pb-6 mt-8">
        <div className="flex flex-wrap gap-y-14 gap-x-1 sm:gap-x-2 md:gap-x-4 justify-center px-2 items-end">
          {daysInMonth.map(day => {
            const isToday = day === currentDay;
            const dayEvents = events[day] || [];
            
            return (
              <div key={day} className="flex flex-col items-center group/day relative w-10 sm:w-12">
                {/* Event Markers */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-row items-center justify-center z-10 w-max hover:z-30 group/events">
                  {dayEvents.map((ev, idx) => (
                    <div 
                      key={idx} 
                      className={`w-8 h-8 rounded-full bg-brand-900 border border-brand-500/80 flex items-center justify-center shadow-lg transform transition-all duration-300 relative cursor-pointer ${idx > 0 ? '-ml-4 group-hover/events:ml-1 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]' : 'shadow-xl'} hover:!scale-125 hover:!z-50`} 
                      style={{ zIndex: 20 - idx }}
                      title={`${ev.label} ${ev.amount ? ` - ${formatC(ev.amount, ev.currency)}` : ''}`}
                    >
                      <div className="scale-90">{ev.icon}</div>
                    </div>
                  ))}
                </div>

                {/* Day Line & Number */}
                <div className={`w-1 transition-all rounded-full ${isToday ? 'h-10 bg-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.8)]' : 'h-6 bg-brand-600/30 group-hover/day:bg-brand-600/60'}`}></div>
                <span className={`text-[10px] mt-2 font-bold tracking-tighter ${isToday ? 'text-gold-400' : 'text-slate-400 group-hover/day:text-slate-300'}`}>
                  {day}
                </span>
                
                {isToday && (
                  <span className="absolute -bottom-5 text-[8px] uppercase tracking-widest text-gold-500 font-black animate-pulse whitespace-nowrap">
                    {t('Today')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-brand-600/30 flex flex-wrap gap-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> {t('Pay Day')}</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gold-400"></div> {t('Credit Card Due')}</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"></div> {t('Loan Installment')}</div>
        <div className="flex items-center gap-1.5 ml-auto text-slate-400">
          <ArrowRightLeft className="w-3 h-3" />
          {t('Next Pay Day')}: {nextPayDay > lastDayOfMonth ? t('Next Month') : `${nextPayDay} ${t('of month')}`}
        </div>
      </div>
    </div>
  );
}
