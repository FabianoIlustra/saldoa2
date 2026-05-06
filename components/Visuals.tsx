
// Force sync
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid, LabelList } from 'recharts';
import { Transaction, Category, User, Account, RecurringTransaction } from '../types';
import FilterBar, { FilterState } from './FilterBar';
import { isWithinInterval, parseISO, format, isBefore, isSameMonth, isSameYear, startOfDay, startOfWeek, endOfMonth, differenceInDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpDown, ChevronDown, Clock, CheckCircle, AlertCircle, Calendar, Target, Zap, TrendingDown, Pill, ShoppingBag, History, HelpCircle, X } from 'lucide-react';

interface VisualsProps {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  accounts: Account[];
  recurringTransactions: RecurringTransaction[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700 transition-colors">
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-0.5 tracking-widest">{label || payload[0].name}</p>
        {payload.map((p: any, i: number) => (
           <p key={i} className="text-xs font-black" style={{ color: p.color }}>
             {p.name}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
           </p>
        ))}
      </div>
    );
  }
  return null;
};

const Visuals: React.FC<VisualsProps> = ({ transactions, categories, users, accounts, recurringTransactions }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'category' | 'type' | 'value', direction: 'asc' | 'desc' } | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [helpId, setHelpId] = useState<string | null>(null);

  const helpContent: Record<string, { title: string, text: string }> = {
    'spending-summary': {
        title: 'Resumo de Gastos',
        text: 'Acompanha o total de despesas realizadas hoje, nesta semana (desde domingo) e no mês atual (baseado nos filtros de data selecionados).'
    },
    'commitments': {
        title: 'Compromissos Financeiros',
        text: 'Mostra o quanto você já pagou e o quanto deve pagar. "Previstas" são contas recorrentes deste mês que ainda não foram lançadas. "Atrasadas" são contas que já passaram da data de vencimento prevista.'
    },
    'budgets': {
        title: 'Orçamentos Ativos',
        text: 'Monitora o progresso dos limites mensais que você configurou para cada categoria em "Ajustes". As cores indicam se você está dentro, perto ou acima da meta.'
    },
    'pace': {
        title: 'Ritmo de Gastos (Pace)',
        text: 'Calcula o valor médio que você pode gastar diariamente nos dias que restam do mês, para não ultrapassar seu orçamento total planejado.'
    },
    'lifestyle': {
        title: 'Essencial vs. Lifestyle',
        text: 'Compara gastos vitais (moradia, saúde, alimentação básica) contra gastos de estilo de vida (lazer, compras, assinaturas). Útil para entender se suas prioridades estão equilibradas.'
    },
    'savings': {
        title: 'Taxa de Poupança',
        text: 'A porcentagem da sua renda mensal que sobra após todas as despesas. Idealmente, essa taxa deve ser de pelo menos 15-20% para uma vida financeira saudável.'
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!currentFilters) return transactions;
    // ... filtering logic ...

    return transactions.filter(t => {
        // Search
        const matchesSearch = t.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                             t.category.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());
        
        // Type (Visuals usually show both, but if filtered, we respect it)
        const matchesType = currentFilters.type === 'ALL' || t.type === currentFilters.type;
        
        // Categories
        const matchesCategory = currentFilters.categories.length === 0 || currentFilters.categories.includes(t.category);
        
        // Accounts
        const matchesAccount = currentFilters.accounts.length === 0 || currentFilters.accounts.includes(t.accountId);
        
        // Date Range
        if (!t.date) return false;
        const tDate = parseISO(t.date);
        if (isNaN(tDate.getTime())) return false;
        
        const matchesDate = isWithinInterval(tDate, {
           start: parseISO(currentFilters.dateRange.start),
           end: parseISO(currentFilters.dateRange.end)
        });

        return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesDate;
    });
  }, [transactions, currentFilters]);

  const normalizedTransactions = useMemo(() => {
    return filteredTransactions.map(t => {
        if (t.type === 'TRANSFER' && currentFilters?.accounts.length === 1) {
            const accId = currentFilters.accounts[0];
            if (t.accountId === accId) {
                return { ...t, type: 'EXPENSE' as const };
            } else if (t.toAccountId === accId) {
                return { ...t, type: 'INCOME' as const };
            }
        }
        return t;
    });
  }, [filteredTransactions, currentFilters]);

  const categorySummary = useMemo(() => {
    const summary: Record<string, { category: string, type: string, value: number }> = {};
    
    normalizedTransactions.forEach(t => {
      const key = `${t.category}-${t.type}`;
      if (!summary[key]) {
        summary[key] = { category: t.category, type: t.type, value: 0 };
      }
      summary[key].value += t.amount;
    });

    let result = Object.values(summary);

    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filteredTransactions, sortConfig]);

  const requestSort = (key: 'category' | 'type' | 'value') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalSummaryValue = categorySummary.reduce((sum, item) => sum + (item.type === 'INCOME' ? item.value : -item.value), 0);

  const financialStats = useMemo(() => {
    const targetDate = currentFilters ? currentFilters.currentDate : new Date();
    
    // 1. Current Paid Expenses in the period (filtered)
    const paidExpenses = normalizedTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. Map recurring transactions for the month to find Pending and Late
    const monthRecs = recurringTransactions.filter(r => r.active && r.type === 'EXPENSE').map(rec => {
        const isPaid = transactions.some(t => {
            const tDate = parseISO(t.date);
            return t.description === rec.description && 
                   isSameMonth(tDate, targetDate) &&
                   isSameYear(tDate, targetDate);
        });

        const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), rec.dayOfMonth);
        let status: 'pending' | 'late' | 'paid' = 'pending';
        
        if (isPaid) status = 'paid';
        else if (isBefore(dueDate, new Date())) status = 'late';

        return { ...rec, status, amount: rec.amount };
    });

    const plannedExpenses = monthRecs
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.amount, 0);
    
    const lateExpenses = monthRecs
        .filter(r => r.status === 'late')
        .reduce((sum, r) => sum + r.amount, 0);

    return {
        paidExpenses,
        plannedExpenses,
        lateExpenses,
        totalCommitment: paidExpenses + plannedExpenses + lateExpenses
    };
  }, [filteredTransactions, recurringTransactions, transactions, currentFilters]);

  const advancedStats = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { locale: ptBR });
    
    const daySpent = transactions
        .filter(t => t.type === 'EXPENSE' && isSameDay(parseISO(t.date), today))
        .reduce((sum, t) => sum + t.amount, 0);

    const weekSpent = transactions
        .filter(t => t.type === 'EXPENSE' && isWithinInterval(parseISO(t.date), { start: startOfThisWeek, end: today }))
        .reduce((sum, t) => sum + t.amount, 0);

    const monthSpent = normalizedTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

    const monthIncome = normalizedTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = monthIncome > 0 ? Math.max(0, ((monthIncome - monthSpent) / monthIncome) * 100) : 0;

    // Essential vs Lifestyle
    let essentialSpent = 0;
    let lifestyleSpent = 0;
    
    normalizedTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
        const cat = categories.find(c => c.name === t.category);
        if (cat?.isEssential) essentialSpent += t.amount;
        else lifestyleSpent += t.amount;
    });

    const monitoredCategories = categories.filter(c => c.monitored && (c.type === 'EXPENSE' || !c.type));
    const budgetProgress = monitoredCategories.map(cat => {
        const spent = normalizedTransactions
            .filter(t => t.category === cat.name && t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            ...cat,
            spent,
            percent: cat.limit ? (spent / cat.limit) * 100 : 0
        };
    });

    const lastDayOfMonth = endOfMonth(today);
    const daysRemaining = Math.max(1, differenceInDays(lastDayOfMonth, today) + 1);
    const totalRemainingBudget = budgetProgress.reduce((sum, b) => sum + (b.limit ? Math.max(0, b.limit - b.spent) : 0), 0);
    const dailyAllowance = totalRemainingBudget / daysRemaining;

    return {
        daySpent,
        weekSpent,
        monthSpent,
        savingsRate,
        essentialSpent,
        lifestyleSpent,
        budgetProgress,
        dailyAllowance,
        daysRemaining
    };
  }, [transactions, filteredTransactions, categories]);

  const expenseData = useMemo(() => {
    const data = normalizedTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc: any[], t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);
    
    return data.slice(0, 5);
  }, [normalizedTransactions]);

  const dailyFlow = useMemo(() => {
    const sorted = [...normalizedTransactions].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    let currentBalance = 0;
    const history = sorted.reduce((acc: any[], t) => {
      const date = parseISO(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const change = t.type === 'INCOME' ? t.amount : -t.amount;
      currentBalance += change;
      
      const existing = acc.find(item => item.name === date);
      if (existing) {
        existing.saldo = currentBalance;
      } else {
        acc.push({ name: date, saldo: currentBalance });
      }
      return acc;
    }, []);

    return history.slice(-15); // Show last 15 data points of the filtered range
  }, [normalizedTransactions]);

  const monthlyHistory = useMemo(() => {
     // Group by Month/Year
     const grouped = normalizedTransactions.reduce((acc: any, t) => {
         const date = parseISO(t.date);
         const key = format(date, 'MMM/yy', { locale: ptBR });
         
         if (!acc[key]) acc[key] = { name: key, receitas: 0, despesas: 0 };
         
         if (t.type === 'INCOME') acc[key].receitas += t.amount;
         else acc[key].despesas += t.amount;
         
         return acc;
     }, {});

     return Object.values(grouped); // No sorting needed if we assume chronological input or sort keys
  }, [normalizedTransactions]);

  const getCategoryColor = (name: string) => {
    return categories.find(c => c.name === name)?.color || '#6366f1';
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-20 animate-in fade-in duration-700">
      
      <FilterBar 
          categories={categories}
          accounts={accounts}
          onFilterChange={setCurrentFilters}
      />

      {/* Unified Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Recent Spending */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Zap className="w-24 h-24" />
          </div>
          
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <History className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Resumo de Gastos</span>
            </div>
            <button onClick={() => setHelpId('spending-summary')} className="p-1 hover:bg-white/20 rounded-full transition-colors text-white/60 hover:text-white">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8 relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Gasto de Hoje</p>
              <p className="text-4xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advancedStats.daySpent)}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Desta Semana</p>
                <p className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advancedStats.weekSpent)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Deste Mês</p>
                <p className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advancedStats.monthSpent)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Financial Commitments */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.07] group-hover:scale-110 transition-transform">
            <CheckCircle className="w-24 h-24 text-slate-900 dark:text-white" />
          </div>

          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compromissos Financeiros</span>
            </div>
            <button onClick={() => setHelpId('commitments')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-indigo-600">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8 relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Comprometimento Total</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats.totalCommitment)}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Pagos</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats.paidExpenses)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1">Previstos</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats.plannedExpenses)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Atrasados</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialStats.lateExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table - Collapsible */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
        <button 
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            className="w-full p-8 md:p-10 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="text-indigo-600">
                    <ArrowUpDown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5 text-left">Resumo por Categoria</h3>
                  <p className="text-xs text-slate-500 font-medium">Valores totais agrupados</p>
                </div>
            </div>
            <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 transition-transform duration-300 ${isSummaryOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-5 h-5" />
            </div>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isSummaryOpen ? 'max-h-[2000px] opacity-100 p-8 md:p-10 pt-0 md:pt-0' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="border-t border-slate-50 dark:border-slate-800 pt-8 overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('category')}>
                  <div className="flex items-center gap-2">Categoria <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('type')}>
                  <div className="flex items-center gap-2">Tipo <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('value')}>
                  <div className="flex items-center justify-end gap-2">Valor <ArrowUpDown className="w-3 h-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(item.category) }} />
                    {item.category}
                  </td>
                  <td className="py-3 px-4 text-xs font-bold">
                    <span className={`px-2 py-1 rounded-full text-[9px] uppercase tracking-wider ${item.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {item.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-50 dark:bg-slate-800/50">
                 <td colSpan={2} className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Total do Período</td>
                 <td className={`py-4 px-4 text-sm font-black text-right ${totalSummaryValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSummaryValue)}
                 </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

      {/* Advanced Budget Monitoring & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Budget Progress Bars */}
        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <header className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Orçamentos Ativos</h3>
                <p className="text-xs text-slate-500 font-medium">Controle de limites por categoria</p>
              </div>
            </div>
            <button onClick={() => setHelpId('budgets')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-indigo-600">
              <HelpCircle className="w-5 h-5" />
            </button>
          </header>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {advancedStats.budgetProgress.length > 0 ? (
              advancedStats.budgetProgress.map((budget) => {
                const isOver = budget.percent > 100;
                const isWarning = budget.percent > 85;
                
                return (
                  <div key={budget.id} className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: budget.color }} />
                        <span className="text-sm font-black text-slate-800 dark:text-white">{budget.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.spent)} / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.limit || 0)}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, budget.percent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                      <span className={`${isOver ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-400'}`}>
                        {isOver ? 'Limite Estourado' : isWarning ? 'Quase no Limite' : 'Dentro do Orçamento'}
                      </span>
                      <span className="text-slate-500">{Math.round(budget.percent)}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <Target className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-400 px-10">
                  Nenhuma categoria sendo monitorada. Habilite o monitoramento em Ajustes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pace and Savings Rate Indicator */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Ritmo de Gastos (Pace)</h3>
                  <p className="text-xs text-slate-500 font-medium">Sugestão de uso diário</p>
                </div>
              </div>
              <button 
                onClick={() => setHelpId('pace')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-indigo-600"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <p className={`text-4xl font-black ${advancedStats.dailyAllowance < 0 ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advancedStats.dailyAllowance)}
                </p>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                  {advancedStats.dailyAllowance < 0 
                    ? 'Orçamento ultrapassado! Ajuste seus gastos.' 
                    : `Disponível por dia nos próximos ${advancedStats.daysRemaining} dias`}
                </p>
              </div>
              <div className="hidden sm:block">
                <TrendingDown className={`w-12 h-12 ${advancedStats.dailyAllowance < 0 ? 'text-rose-500' : 'text-slate-100 dark:text-slate-800'}`} />
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Taxa de Poupança</h4>
                  <button onClick={() => setHelpId('savings')} className="text-slate-300 hover:text-indigo-500">
                    <HelpCircle className="w-3 h-3" />
                  </button>
                </div>
                <p className={`text-xl font-black ${advancedStats.savingsRate >= 20 ? 'text-emerald-500' : advancedStats.savingsRate >= 10 ? 'text-blue-500' : 'text-amber-500'}`}>
                  {Math.round(advancedStats.savingsRate)}%
                </p>
              </div>
              <div className="text-right">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Financeiro</h4>
                <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  {advancedStats.savingsRate >= 30 ? 'Investidor Master' : advancedStats.savingsRate >= 15 ? 'Saudável' : 'Ajustar Contas'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <header className="mb-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-500">
                    <ShoppingBag className="w-5 h-5" />
                 </div>
                 <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Essencial vs. Lifestyle</h3>
                  <p className="text-xs text-slate-500 font-medium">Equilíbrio de prioridades</p>
                </div>
              </div>
              <button onClick={() => setHelpId('lifestyle')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-indigo-600">
                <HelpCircle className="w-5 h-5" />
              </button>
            </header>
            
            <div className="flex h-[150px] gap-4">
               <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Pill className="w-4 h-4 text-emerald-500" />
                       <span className="text-[10px] font-black uppercase text-slate-500">Essenciais</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advancedStats.essentialSpent)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(advancedStats.essentialSpent / (advancedStats.essentialSpent + advancedStats.lifestyleSpent || 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                       <ShoppingBag className="w-4 h-4 text-indigo-500" />
                       <span className="text-[10px] font-black uppercase text-slate-500">Estilo de Vida</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advancedStats.lifestyleSpent)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(advancedStats.lifestyleSpent / (advancedStats.essentialSpent + advancedStats.lifestyleSpent || 1)) * 100}%` }}
                    />
                  </div>
               </div>
               
               <div className="w-[100px] flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Essencial', value: advancedStats.essentialSpent, color: '#10b981' },
                          { name: 'Lifestyle', value: advancedStats.lifestyleSpent, color: '#6366f1' }
                        ]}
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {[
                          { color: '#10b981' },
                          { color: '#6366f1' }
                        ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Distribuição de Gastos */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <header className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Maiores Despesas</h3>
            <p className="text-xs text-slate-500 font-medium">Top 5 categorias do período</p>
          </header>
          
          <div className="h-[280px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={expenseData} 
                  innerRadius="65%" 
                  outerRadius="85%" 
                  paddingAngle={10} 
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {expenseData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Saldo */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <header className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Tendência de Saldo</h3>
            <p className="text-xs text-slate-500 font-medium">Evolução diária no período</p>
          </header>

          <div className="h-[280px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFlow}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                  strokeWidth={3}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Histórico Receitas vs Despesas (Novo Gráfico) */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
         <header className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Receitas vs Despesas</h3>
            <p className="text-xs text-slate-500 font-medium">Comparativo mensal</p>
          </header>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyHistory}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                   <Tooltip content={<CustomTooltip />} />
                   <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
                   <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="receitas" position="top" formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} />
                   </Bar>
                   <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="despesas" position="top" formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#ef4444' }} />
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

      {/* User Comparison Section */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">Participação de Gastos</h3>
        <div className="space-y-6">
          {/* Gastos Conjuntos */}
          {(() => {
              const jointExpenses = filteredTransactions
                  .filter(t => t.isJoint && t.type === 'EXPENSE')
                  .reduce((sum, t) => sum + t.amount, 0);
              const totalExpenses = filteredTransactions
                  .filter(t => t.type === 'EXPENSE')
                  .reduce((sum, t) => sum + t.amount, 0);
              const percentage = totalExpenses > 0 ? (jointExpenses / totalExpenses) * 100 : 0;

              return (
                  <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conjunto (Ambos)</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm bg-indigo-500"
                              style={{ width: `${percentage}%` }}
                          />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter pt-0.5">
                          <span>R$ 0,00</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jointExpenses)}</span>
                      </div>
                  </div>
              );
          })()}

          {users.map(user => {
            const userExpenses = filteredTransactions
              .filter(t => t.userId === user.id && t.type === 'EXPENSE' && !t.isJoint) // Exclude joint from individual
              .reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = filteredTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0);
            const percentage = totalExpenses > 0 ? (userExpenses / totalExpenses) * 100 : 0;

            return (
              <div key={user.id} className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.avatarColor }} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${percentage}%`, backgroundColor: user.avatarColor }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter pt-0.5">
                   <span>R$ 0,00</span>
                   <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(userExpenses)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Modal */}
      {helpId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                         <HelpCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{helpContent[helpId]?.title}</h4>
                   </div>
                   <button onClick={() => setHelpId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {helpContent[helpId]?.text}
                </p>
                <button 
                  onClick={() => setHelpId(null)}
                  className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Entendi
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visuals;
