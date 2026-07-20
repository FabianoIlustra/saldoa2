
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, FinancialAnalysis, Account, User, RecurringTransaction } from '../types';
import { ArrowUpRight, ArrowDownRight, Sparkles, CreditCard, Plus, Camera, Mic, ArrowRight, TrendingUp, Users, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react';
import { getFinancialInsights } from '../services/geminiService';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  onManualClick: () => void;
  onScannerClick: () => void;
  onVoiceClick: () => void;
  onManageAccounts: () => void;
  onViewVisuals: () => void;
  spendingCeiling?: number;
  currentUserProfile?: User | null;
  onUpgradeClick?: () => void;
  onInviteClick?: () => void;
  recurringTransactions?: RecurringTransaction[];
  allRawTransactions?: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  accounts, 
  onManualClick, 
  onScannerClick, 
  onVoiceClick,
  onManageAccounts,
  onViewVisuals,
  spendingCeiling,
  currentUserProfile,
  onUpgradeClick,
  onInviteClick,
  recurringTransactions = [],
  allRawTransactions = []
}) => {
  const [insights, setInsights] = useState<FinancialAnalysis | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isWeeklyScheduleOpen, setIsWeeklyScheduleOpen] = useState(false);

  const totalBalance = useMemo(() => {
    const total = accounts.reduce((acc, a) => acc + a.currentBalance, 0);
    return Math.round(total * 100) / 100;
  }, [accounts]);
  
  // Monthly calculations
  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const monthlyTransactions = transactions.filter(t => {
      if (t.isTemplate) return false;
      const tDate = t.date;
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      return tDate >= startStr && tDate <= endStr;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    const expense = monthlyTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);

    return { monthlyIncome: income, monthlyExpense: expense };
  }, [transactions]);

  const spendingPercentage = useMemo(() => {
    if (!spendingCeiling || spendingCeiling <= 0) return 0;
    return Math.min((monthlyExpense / spendingCeiling) * 100, 100);
  }, [monthlyExpense, spendingCeiling]);

  const spendingColor = useMemo(() => {
    if (spendingPercentage >= 95) return 'bg-rose-500';
    if (spendingPercentage >= 80) return 'bg-amber-500';
    return 'bg-blue-500';
  }, [spendingPercentage]);

  useEffect(() => {
    if (transactions.length > 5) {
      const fetchInsights = async () => {
        setLoadingInsights(true);
        try {
          const data = await getFinancialInsights(transactions);
          setInsights(data);
        } catch (e) {
          console.error("Erro insights:", e);
        } finally {
          setLoadingInsights(false);
        }
      };
      fetchInsights();
    }
  }, [transactions.length]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const weeklyReminders = useMemo(() => {
    const list: { id: string; date: Date; dateStr: string; label: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; description: string; amount: number; isRecurring: boolean; category: string; isTemplate?: boolean; isLate: boolean }[] = [];
    const today = new Date();
    
    // 1. Past 30 days for late items (from -30 up to -1)
    for (let i = -30; i < 0; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');
      const targetDay = targetDate.getDate();
      
      const diffDays = Math.abs(i);
      const dayLabel = `Atrasado (${diffDays} ${diffDays === 1 ? 'dia' : 'dias'})`;

      // Check recurring
      recurringTransactions.forEach(rt => {
        if (rt.active && rt.dayOfMonth === targetDay) {
          // Check if eligible based on start date
          let isEligible = true;
          if (rt.startDate) {
            const start = parseISO(rt.startDate);
            const startYear = start.getFullYear();
            const startMonth = start.getMonth();
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();
            
            if (startYear > targetYear) isEligible = false;
            if (startYear === targetYear && startMonth > targetMonth) isEligible = false;
          }

          if (isEligible) {
            // Check if already paid in that month
            const isPaid = allRawTransactions.some(t => {
              if (t.isTemplate) return false;
              const tDate = parseISO(t.date);
              return t.description === rt.description &&
                     tDate.getFullYear() === targetDate.getFullYear() &&
                     tDate.getMonth() === targetDate.getMonth();
            });

            if (!isPaid) {
              list.push({
                id: `rec-late-${rt.id}-${targetDateStr}`,
                date: targetDate,
                dateStr: targetDateStr,
                label: dayLabel,
                type: rt.type,
                description: rt.description,
                amount: rt.amount,
                isRecurring: true,
                category: rt.category,
                isTemplate: true,
                isLate: true
              });
            }
          }
        }
      });

      // Check template transactions (unpaid templates remain on past dates as late)
      allRawTransactions.forEach(t => {
        if (t.date === targetDateStr && t.isTemplate) {
          list.push({
            id: `trans-late-${t.id}-${targetDateStr}`,
            date: targetDate,
            dateStr: targetDateStr,
            label: dayLabel,
            type: t.type,
            description: `${t.description} (${t.installmentNumber}/${t.totalInstallments})`,
            amount: t.amount,
            isRecurring: false,
            category: t.category,
            isTemplate: true,
            isLate: true
          });
        }
      });
    }

    // 2. Next 7 days for pending/upcoming items (from 0 up to 6)
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');
      const targetDay = targetDate.getDate();
      
      let dayLabel = '';
      if (i === 0) dayLabel = 'Hoje';
      else if (i === 1) dayLabel = 'Amanhã';
      else {
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        dayLabel = daysOfWeek[targetDate.getDay()];
      }

      // Check recurring
      recurringTransactions.forEach(rt => {
        if (rt.active && rt.dayOfMonth === targetDay) {
          // Check if eligible based on start date
          let isEligible = true;
          if (rt.startDate) {
            const start = parseISO(rt.startDate);
            const startYear = start.getFullYear();
            const startMonth = start.getMonth();
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();
            
            if (startYear > targetYear) isEligible = false;
            if (startYear === targetYear && startMonth > targetMonth) isEligible = false;
          }

          if (isEligible) {
            // Check if already paid in that month
            const isPaid = allRawTransactions.some(t => {
              if (t.isTemplate) return false;
              const tDate = parseISO(t.date);
              return t.description === rt.description &&
                     tDate.getFullYear() === targetDate.getFullYear() &&
                     tDate.getMonth() === targetDate.getMonth();
            });

            if (!isPaid) {
              list.push({
                id: `rec-${rt.id}-${targetDateStr}`,
                date: targetDate,
                dateStr: targetDateStr,
                label: dayLabel,
                type: rt.type,
                description: rt.description,
                amount: rt.amount,
                isRecurring: true,
                category: rt.category,
                isTemplate: true,
                isLate: false
              });
            }
          }
        }
      });

      // Check template transactions
      allRawTransactions.forEach(t => {
        if (t.date === targetDateStr && t.isTemplate) {
          list.push({
            id: `trans-${t.id}-${targetDateStr}`,
            date: targetDate,
            dateStr: targetDateStr,
            label: dayLabel,
            type: t.type,
            description: `${t.description} (${t.installmentNumber}/${t.totalInstallments})`,
            amount: t.amount,
            isRecurring: false,
            category: t.category,
            isTemplate: true,
            isLate: false
          });
        }
      });
    }

    // Sort chronologically
    return list.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [allRawTransactions, recurringTransactions]);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Resumo Executivo e Ações Rápidas */}
      <div className="flex flex-col items-center text-center py-6 md:py-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">Patrimônio Disponível</span>
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-10 transition-all">
          {formatCurrency(totalBalance)}
        </h2>
        
        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Receitas (Mês)</span>
                </div>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(monthlyIncome)}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Despesas (Mês)</span>
                </div>
                <p className="text-xl font-black text-rose-700 dark:text-rose-400">{formatCurrency(monthlyExpense)}</p>
            </div>
        </div>

        {/* Spending Ceiling Progress Bar */}
        {spendingCeiling && spendingCeiling > 0 && (
            <div className="w-full max-w-lg mb-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teto de Gastos</span>
                    <div className="text-right">
                        <span className={`text-sm font-black ${spendingPercentage >= 95 ? 'text-rose-500' : spendingPercentage >= 80 ? 'text-amber-500' : 'text-blue-500'}`}>
                            {spendingPercentage.toFixed(0)}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">de {formatCurrency(spendingCeiling)}</span>
                    </div>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${spendingColor} transition-all duration-1000 ease-out`} 
                        style={{ width: `${spendingPercentage}%` }}
                    ></div>
                </div>
            </div>
        )}
        
        {/* Trio de Botões Dinâmicos */}
        <div className="flex justify-center items-center gap-6 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={onManualClick}
              className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none active:scale-90 transition-all hover:bg-indigo-700"
            >
              <Plus className="w-8 h-8" />
            </button>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Manual</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={onScannerClick}
              className="w-16 h-16 md:w-20 md:h-20 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-amber-100 dark:shadow-none active:scale-90 transition-all hover:bg-amber-600"
            >
              <Camera className="w-7 h-7" />
            </button>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Scanner</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={onVoiceClick}
              className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-100 dark:shadow-none active:scale-90 transition-all hover:bg-emerald-600"
            >
              <Mic className="w-7 h-7" />
            </button>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Voz</span>
          </div>
        </div>
      </div>

      {/* Convidar Banner */}
      <div 
        onClick={onInviteClick}
        className="cursor-pointer bg-gradient-to-r from-rose-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-rose-500/20 dark:via-indigo-500/15 dark:to-emerald-500/20 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              Convidar Membro
              <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-normal">Família</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gerencie suas finanças em conjunto com seu parceiro ou família.</p>
          </div>
        </div>
        <div className="p-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* Accounts Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <button 
            onClick={() => setIsAccountsOpen(!isAccountsOpen)}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>Minhas Contas</span>
            {isAccountsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        {isAccountsOpen && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
            {accounts.map(account => (
              <div key={account.id} className="px-4 py-2.5 flex items-center justify-between transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ backgroundColor: account.color }}>
                    {account.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{account.name}</p>
                    <span className="text-[8px] font-black uppercase text-slate-400">{account.type}</span>
                  </div>
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(account.currentBalance)}</h4>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="text-center py-4 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-xs text-slate-400 font-medium">Nenhuma conta cadastrada.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Weekly Schedule Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <button 
            onClick={() => setIsWeeklyScheduleOpen(!isWeeklyScheduleOpen)}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Programação da Semana</span>
            {isWeeklyScheduleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <span className="text-[8px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase">
            Próximos 7 dias
          </span>
        </div>

        {isWeeklyScheduleOpen && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
            {weeklyReminders.map(reminder => {
              const isLate = reminder.isLate;
              return (
                <div 
                  key={reminder.id} 
                  className={`px-4 py-3 flex items-center justify-between gap-3 transition-all border-l-4 ${
                    isLate 
                      ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-400 dark:border-rose-600 hover:bg-rose-100/30 dark:hover:bg-rose-900/20' 
                      : 'border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 border ${
                      reminder.type === 'INCOME' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                    }`}>
                      <span className="text-[7px] font-black uppercase tracking-tighter leading-none">
                        {reminder.date.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3).replace('.', '').toUpperCase()}
                      </span>
                      <span className="text-xs font-black leading-none mt-0.5">{format(reminder.date, 'dd')}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{reminder.label}</span>
                        {reminder.isRecurring && (
                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[6px] font-black uppercase px-1 rounded-full">
                            Recorrente
                          </span>
                        )}
                        {isLate && (
                          <span className="bg-rose-100/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full">
                            Atrasado
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate mt-0.5">{reminder.description}</p>
                      <span className="text-[8px] font-black uppercase text-slate-400 leading-none">{reminder.category}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black block ${reminder.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {reminder.type === 'INCOME' ? '+' : '-'}{formatCurrency(reminder.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
            {weeklyReminders.length === 0 && (
              <div className="text-center py-6 bg-slate-50/50 dark:bg-slate-900/10">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nenhum compromisso pendente.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Informação de Plano Atual e Botão de Upgrade no modo mobile (md:hidden) */}
      {currentUserProfile && (
        <div className="md:hidden mt-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Plano Atual</p>
            <p className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase mt-0.5">
              {currentUserProfile.tier === 'premium' ? '👑 Premium' :
               currentUserProfile.tier === 'medio' ? '⭐ Médio' :
               currentUserProfile.tier === 'basico' ? '✨ Básico' : 'Grátis'}
            </p>
          </div>
          {currentUserProfile.tier !== 'premium' && onUpgradeClick && (
            <button 
              onClick={onUpgradeClick}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1 animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade
            </button>
          )}
        </div>
      )}

      {/* AI Insight Card REMOVED */}
    </div>
  );
};

export default Dashboard;
