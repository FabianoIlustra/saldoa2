
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, FinancialAnalysis, Account } from '../types';
import { ArrowUpRight, ArrowDownRight, Sparkles, CreditCard, Plus, Camera, Mic, ArrowRight, TrendingUp } from 'lucide-react';
import { getFinancialInsights } from '../services/geminiService';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  onManualClick: () => void;
  onScannerClick: () => void;
  onVoiceClick: () => void;
  onManageAccounts: () => void;
  onViewVisuals: () => void;
  spendingCeiling?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  accounts, 
  onManualClick, 
  onScannerClick, 
  onVoiceClick,
  onManageAccounts,
  onViewVisuals,
  spendingCeiling
}) => {
  const [insights, setInsights] = useState<FinancialAnalysis | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

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
      const date = parseISO(t.date);
      return isWithinInterval(date, { start, end });
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

      {/* Accounts Section */}
      <section>
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Minhas Contas
          </h3>
          <button 
            onClick={onManageAccounts}
            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
          >
            Gerenciar
          </button>
        </div>
        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
          {accounts.map(account => (
            <div key={account.id} className="min-w-[240px] md:min-w-0 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: account.color }}>
                  {account.name.charAt(0)}
                </div>
                <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">{account.type}</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">{account.name}</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(account.currentBalance)}</h4>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="w-full text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Nenhuma conta cadastrada.</p>
            </div>
          )}
        </div>
      </section>

      {/* AI Insight Card */}
      <div 
        onClick={onViewVisuals}
        className="relative group mx-1 cursor-pointer"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-[2.5rem] opacity-10 blur-sm group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Dica do Consultor IA</h4>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
              {loadingInsights ? "Analisando dados..." : insights?.summary || "Adicione lançamentos para receber insights personalizados sobre seu patrimônio."}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
