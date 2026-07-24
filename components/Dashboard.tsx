
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, FinancialAnalysis, Account, User, RecurringTransaction, Goal, InstallmentGroup } from '../types';
import { ArrowUpRight, ArrowDownRight, Sparkles, CreditCard, Plus, Camera, Mic, ArrowRight, TrendingUp, Users, ChevronDown, ChevronUp, Calendar, Clock, PiggyBank, Percent, Activity, Trophy, Repeat, AlertTriangle, Heart, Target, Zap, History } from 'lucide-react';
import { getFinancialInsights, isLocalModeEnabled } from '../services/geminiService';
import { startOfMonth, endOfMonth, startOfWeek, isWithinInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  goals?: Goal[];
  installmentGroups?: InstallmentGroup[];
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
  allRawTransactions = [],
  goals = [],
  installmentGroups = []
}) => {
  const [insights, setInsights] = useState<FinancialAnalysis | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isWeeklyScheduleOpen, setIsWeeklyScheduleOpen] = useState(true);
  const [localMode, setLocalMode] = useState(() => isLocalModeEnabled());

  useEffect(() => {
    const handleLocalModeChange = () => {
      setLocalMode(isLocalModeEnabled());
    };
    window.addEventListener('local-mode-change', handleLocalModeChange);
    return () => {
      window.removeEventListener('local-mode-change', handleLocalModeChange);
    };
  }, []);

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

  const ceilingPercentReal = useMemo(() => {
    if (!spendingCeiling || spendingCeiling <= 0) return 0;
    return Math.round((monthlyExpense / spendingCeiling) * 100);
  }, [monthlyExpense, spendingCeiling]);

  const spendingPercentage = useMemo(() => {
    if (!spendingCeiling || spendingCeiling <= 0) return 0;
    return Math.min((monthlyExpense / spendingCeiling) * 100, 100);
  }, [monthlyExpense, spendingCeiling]);

  const spendingColor = useMemo(() => {
    if (spendingPercentage >= 95) return 'bg-rose-500';
    if (spendingPercentage >= 80) return 'bg-amber-500';
    return 'bg-blue-500';
  }, [spendingPercentage]);

  const now = new Date();
  const periodLabel = `${format(now, 'MMMM', { locale: ptBR })} de ${format(now, 'yyyy')}`;

  const monthlyTransactionsList = useMemo(() => {
    const startStr = format(startOfMonth(now), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(now), 'yyyy-MM-dd');
    return transactions.filter(t => !t.isTemplate && t.date >= startStr && t.date <= endStr);
  }, [transactions]);

  const monthlyTransactionsCount = monthlyTransactionsList.length;

  const monthlyExpenseCount = useMemo(() => {
    return monthlyTransactionsList.filter(t => t.type === 'EXPENSE').length;
  }, [monthlyTransactionsList]);

  // Today and Week expense calculations for Resumo de Gastos
  const { daySpent, weekSpent } = useMemo(() => {
    const todayDate = new Date();
    const todayStr = format(todayDate, 'yyyy-MM-dd');
    const weekStart = startOfWeek(todayDate, { weekStartsOn: 0 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    let day = 0;
    let week = 0;

    transactions.forEach(t => {
      if (t.isTemplate || t.type !== 'EXPENSE') return;
      if (t.date === todayStr) {
        day += t.amount;
      }
      if (t.date >= weekStartStr && t.date <= todayStr) {
        week += t.amount;
      }
    });

    return { daySpent: day, weekSpent: week };
  }, [transactions]);

  // Top expense categories for month
  const topExpenseCategories = useMemo(() => {
    const todayDate = new Date();
    const startStr = format(startOfMonth(todayDate), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(todayDate), 'yyyy-MM-dd');

    const catMap: Record<string, number> = {};
    let total = 0;

    transactions.forEach(t => {
      if (t.isTemplate || t.type !== 'EXPENSE') return;
      if (t.date >= startStr && t.date <= endStr) {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        total += t.amount;
      }
    });

    const sorted = Object.entries(catMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { list: sorted.slice(0, 4), total };
  }, [transactions]);

  const netMonthlyBalance = monthlyIncome - monthlyExpense;

  // 1. Taxa de poupança
  const savingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    const rate = ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100;
    return Math.max(0, Math.round(rate));
  }, [monthlyIncome, monthlyExpense]);

  const savingsRateLabel = useMemo(() => {
    if (monthlyIncome <= 0) return 'Sem receita';
    if (savingsRate >= 30) return 'Excelente!';
    if (savingsRate >= 15) return 'Muito bom';
    if (savingsRate > 0) return 'Abaixo da meta';
    return 'Sem poupança';
  }, [savingsRate, monthlyIncome]);

  // 2. Comprometido
  const commitmentRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    const rate = (monthlyExpense / monthlyIncome) * 100;
    return Math.min(100, Math.round(rate));
  }, [monthlyIncome, monthlyExpense]);

  // 3. Gasto médio/dia
  const dailyAvgExpense = useMemo(() => {
    const day = now.getDate();
    if (day <= 0) return 0;
    return monthlyExpense / day;
  }, [monthlyExpense]);

  // 4. Ticket médio
  const avgTicket = useMemo(() => {
    if (monthlyExpenseCount <= 0) return 0;
    return monthlyExpense / monthlyExpenseCount;
  }, [monthlyExpense, monthlyExpenseCount]);

  // 5. Metas ativas
  const activeGoalsCount = goals.length;
  const totalGoalsAmount = useMemo(() => goals.reduce((acc, g) => acc + (g.currentAmount || 0), 0), [goals]);

  // 6. Recorrentes
  const activeRecurringsCount = useMemo(() => recurringTransactions.filter(r => r.active).length, [recurringTransactions]);
  const totalRecurringMonthly = useMemo(() => recurringTransactions
    .filter(r => r.active && r.type === 'EXPENSE')
    .reduce((acc, r) => acc + r.amount, 0), [recurringTransactions]);

  // 7. Parcelas ativas
  const activeInstallmentsCount = useMemo(() => installmentGroups.filter(g => (g.currentInstallment || 1) <= g.totalInstallments).length, [installmentGroups]);
  const totalInstallmentsMonthly = useMemo(() => installmentGroups
    .filter(g => (g.currentInstallment || 1) <= g.totalInstallments)
    .reduce((acc, g) => acc + g.installmentAmount, 0), [installmentGroups]);

  // 8. Orçamentos estourados
  const isOverCeiling = spendingCeiling && spendingCeiling > 0 && monthlyExpense > spendingCeiling;
  const overCeilingCount = isOverCeiling ? 1 : 0;

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
            // Check if already paid in that month (case-insensitive and partial match)
            const isPaid = allRawTransactions.some(t => {
              if (t.isTemplate) return false;
              const tDate = parseISO(t.date);
              const isSamePeriod = tDate.getFullYear() === targetDate.getFullYear() && tDate.getMonth() === targetDate.getMonth();
              if (!isSamePeriod) return false;
              
              const tDesc = t.description.toLowerCase().trim();
              const rtDesc = rt.description.toLowerCase().trim();
              return tDesc === rtDesc || tDesc.includes(rtDesc) || rtDesc.includes(tDesc);
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
          // Robust check if this installment has already been paid
          if (t.installmentGroupId && t.installmentNumber) {
            const isPaidInstallment = allRawTransactions.some(realT => 
              !realT.isTemplate && 
              String(realT.installmentGroupId) === String(t.installmentGroupId) && 
              Number(realT.installmentNumber) === Number(t.installmentNumber)
            );
            if (isPaidInstallment) return; // Skip showing in reminders!
          }

          // Robust check for recurring templates (monthly recurrence) already recorded/paid this month
          if (t.recurrence === 'MONTHLY' || !t.installmentGroupId) {
            const isPaidTemplate = allRawTransactions.some(realT => 
              !realT.isTemplate && 
              (realT.description.toLowerCase().trim() === t.description.toLowerCase().trim() ||
               realT.description.toLowerCase().includes(t.description.toLowerCase().trim()) ||
               t.description.toLowerCase().includes(realT.description.toLowerCase().trim())) &&
              parseISO(realT.date).getFullYear() === targetDate.getFullYear() &&
              parseISO(realT.date).getMonth() === targetDate.getMonth()
            );
            if (isPaidTemplate) return; // Skip showing in reminders!
          }

          const suffix = t.installmentNumber ? `(${t.installmentNumber}/${t.totalInstallments})` : '';
          const displayDescription = suffix && !t.description.endsWith(suffix) ? `${t.description} ${suffix}` : t.description;

          list.push({
            id: `trans-late-${t.id}-${targetDateStr}`,
            date: targetDate,
            dateStr: targetDateStr,
            label: dayLabel,
            type: t.type,
            description: displayDescription,
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
            // Check if already paid in that month (case-insensitive and partial match)
            const isPaid = allRawTransactions.some(t => {
              if (t.isTemplate) return false;
              const tDate = parseISO(t.date);
              const isSamePeriod = tDate.getFullYear() === targetDate.getFullYear() && tDate.getMonth() === targetDate.getMonth();
              if (!isSamePeriod) return false;
              
              const tDesc = t.description.toLowerCase().trim();
              const rtDesc = rt.description.toLowerCase().trim();
              return tDesc === rtDesc || tDesc.includes(rtDesc) || rtDesc.includes(tDesc);
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
          // Robust check if this installment has already been paid
          if (t.installmentGroupId && t.installmentNumber) {
            const isPaidInstallment = allRawTransactions.some(realT => 
              !realT.isTemplate && 
              String(realT.installmentGroupId) === String(t.installmentGroupId) && 
              Number(realT.installmentNumber) === Number(t.installmentNumber)
            );
            if (isPaidInstallment) return; // Skip showing in reminders!
          }

          // Robust check for recurring templates (monthly recurrence) already recorded/paid this month
          if (t.recurrence === 'MONTHLY' || !t.installmentGroupId) {
            const isPaidTemplate = allRawTransactions.some(realT => 
              !realT.isTemplate && 
              (realT.description.toLowerCase().trim() === t.description.toLowerCase().trim() ||
               realT.description.toLowerCase().includes(t.description.toLowerCase().trim()) ||
               t.description.toLowerCase().includes(realT.description.toLowerCase().trim())) &&
              parseISO(realT.date).getFullYear() === targetDate.getFullYear() &&
              parseISO(realT.date).getMonth() === targetDate.getMonth()
            );
            if (isPaidTemplate) return; // Skip showing in reminders!
          }

          const suffix = t.installmentNumber ? `(${t.installmentNumber}/${t.totalInstallments})` : '';
          const displayDescription = suffix && !t.description.endsWith(suffix) ? `${t.description} ${suffix}` : t.description;

          list.push({
            id: `trans-${t.id}-${targetDateStr}`,
            date: targetDate,
            dateStr: targetDateStr,
            label: dayLabel,
            type: t.type,
            description: displayDescription,
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top 2-Column Grid on Desktop (Half-screen Main Balance Card + Half-screen Resumo de Gastos Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Card: Indicador Principal (Saldo do Mês) */}
        <div className="bg-purple-100/90 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-100 rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 text-xs sm:text-sm font-extrabold capitalize">
                <Heart className="w-4 h-4 fill-purple-600/30 text-purple-700 dark:text-purple-400" />
                <span>Saldo do mês · {periodLabel}</span>
              </div>

              {/* Action buttons (+ and Mic) with soft style */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={onManualClick}
                  className="w-9 h-9 bg-white/80 hover:bg-white dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-200/80 dark:border-purple-700/60 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                  title="Novo Lançamento"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button 
                  onClick={onVoiceClick}
                  className="w-9 h-9 bg-white/80 hover:bg-white dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-200/80 dark:border-purple-700/60 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                  title="Lançamento por Voz"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
                {formatCurrency(netMonthlyBalance)}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                {monthlyTransactionsCount} {monthlyTransactionsCount === 1 ? 'transação neste mês' : 'transações neste mês'}
              </p>
            </div>

            {/* Inner Cards for Receitas & Despesas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-3.5 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Receitas</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div className="bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-3.5 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Despesas</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{formatCurrency(monthlyExpense)}</p>
              </div>
            </div>

            {/* Spending Ceiling Progress Bar */}
            {spendingCeiling && spendingCeiling > 0 ? (
              <div className="mt-3 bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-3.5 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Teto de Gastos:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(spendingCeiling)}
                  </span>
                </div>

                <div className="w-full h-2 bg-purple-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      ceilingPercentReal > 100 ? 'bg-rose-500' : ceilingPercentReal >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(ceilingPercentReal, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-end text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                  <span>
                    Gasto: {formatCurrency(monthlyExpense)} ({ceilingPercentReal}%)
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            {/* Ver Contas Toggle Button */}
            <button 
              onClick={() => setIsAccountsOpen(!isAccountsOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-purple-200/80 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-purple-900 dark:text-purple-200 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <span>Ver contas ({accounts.length})</span>
              </div>
              {isAccountsOpen ? <ChevronUp className="w-4 h-4 text-purple-700 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-700 dark:text-purple-400" />}
            </button>

            {/* Expandable Accounts List */}
            {isAccountsOpen && (
              <div className="mt-2.5 bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 rounded-2xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-2xs overflow-hidden p-0.5 bg-white border border-slate-200 dark:border-slate-700" style={{ backgroundColor: account.color || '#8b5cf6' }}>
                        {account.logoUrl ? (
                          <img src={account.logoUrl} alt={account.name} className="w-full h-full object-contain bg-white rounded" />
                        ) : (
                          account.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{account.name}</p>
                        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase">{account.type}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white ml-2">{formatCurrency(account.currentBalance)}</span>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-xs text-slate-500 font-medium text-center py-2">Nenhuma conta cadastrada.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Resumo de Gastos (Gráfico de Resumo de Gastos) */}
        <div className="bg-purple-100/90 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-100 rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/80 dark:bg-purple-900/50 border border-purple-200/80 dark:border-purple-700/60 rounded-xl text-purple-800 dark:text-purple-200 shadow-2xs">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-purple-900 dark:text-purple-200">Resumo de Gastos</h3>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Análise periódica de despesas</p>
                </div>
              </div>

              <button 
                onClick={onViewVisuals}
                className="text-xs font-bold text-purple-800 dark:text-purple-200 hover:text-purple-950 dark:hover:text-white flex items-center gap-1 transition-colors bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-purple-200/80 dark:border-slate-700 shadow-2xs"
              >
                <span>Gráficos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Spend Metrics Grid (Hoje, Esta Semana, Este Mês) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-4">
              <div className="bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-2 sm:p-3 rounded-2xl shadow-2xs min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 truncate">Hoje</p>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-slate-900 dark:text-white tracking-tighter truncate" title={formatCurrency(daySpent)}>{formatCurrency(daySpent)}</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-2 sm:p-3 rounded-2xl shadow-2xs min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 truncate">Esta Semana</p>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-slate-900 dark:text-white tracking-tighter truncate" title={formatCurrency(weekSpent)}>{formatCurrency(weekSpent)}</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-2 sm:p-3 rounded-2xl shadow-2xs min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 truncate">Este Mês</p>
                <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-black text-slate-900 dark:text-white tracking-tighter truncate" title={formatCurrency(monthlyExpense)}>{formatCurrency(monthlyExpense)}</p>
              </div>
            </div>

            {/* Category Expense Breakdown Bars / Graph */}
            <div className="bg-white/90 dark:bg-slate-800/90 border border-purple-200/80 dark:border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-2xs">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Maiores Categorias do Mês</span>
                <span className="text-[10px] text-slate-400">{topExpenseCategories.list.length} ativas</span>
              </p>

              {topExpenseCategories.list.length > 0 ? (
                <div className="space-y-3">
                  {topExpenseCategories.list.map((cat, idx) => {
                    const barColors = ['bg-purple-600', 'bg-indigo-600', 'bg-violet-600', 'bg-rose-500'];
                    const colorClass = barColors[idx % barColors.length];

                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate min-w-0">{cat.category}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatCurrency(cat.amount)}</span>
                            <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 w-7 text-right">{cat.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-purple-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                            style={{ width: `${Math.min(100, cat.percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                  Nenhuma despesa registrada neste mês.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onViewVisuals}
              className="w-full py-2.5 px-4 bg-white/90 hover:bg-white dark:bg-purple-900/50 dark:hover:bg-purple-800/60 text-purple-900 dark:text-purple-200 border border-purple-200/80 dark:border-purple-700/60 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-2xs"
            >
              <span>Ver Gráficos & Relatórios Detalhados</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Grid of 8 Indicator Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Card 1: Taxa de poupança */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <PiggyBank className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Taxa de poupança</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{savingsRate}%</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{savingsRateLabel}</p>
          </div>
        </div>

        {/* Card 2: Comprometido */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Comprometido</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{commitmentRate}%</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">da renda</p>
          </div>
        </div>

        {/* Card 3: Gasto médio/dia */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Gasto médio/dia</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(dailyAvgExpense)}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Total {formatCurrency(monthlyExpense)}</p>
          </div>
        </div>

        {/* Card 4: Ticket médio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Ticket médio</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(avgTicket)}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">por transação</p>
          </div>
        </div>

        {/* Card 5: Metas ativas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-3">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Metas ativas</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{activeGoalsCount}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              {activeGoalsCount > 0 ? `${formatCurrency(totalGoalsAmount)} acumulados` : 'Nenhuma meta'}
            </p>
          </div>
        </div>

        {/* Card 6: Recorrentes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Recorrentes</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{activeRecurringsCount}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{formatCurrency(totalRecurringMonthly)}/mês</p>
          </div>
        </div>

        {/* Card 7: Parcelas ativas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-3">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Parcelas ativas</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{activeInstallmentsCount}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{formatCurrency(totalInstallmentsMonthly)}/mês</p>
          </div>
        </div>

        {/* Card 8: Orçamentos estourados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-0.5">Orçamentos estourados</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{overCeilingCount}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{overCeilingCount > 0 ? 'Atenção ao teto!' : 'Tudo ok'}</p>
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
