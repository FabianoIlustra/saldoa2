
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, FinancialAnalysis, Account } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, CreditCard, ChevronRight, Plus, Camera, Mic, ArrowRight } from 'lucide-react';
import { getFinancialInsights } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  onManualClick: () => void;
  onScannerClick: () => void;
  onVoiceClick: () => void;
  onManageAccounts: () => void;
  onViewVisuals: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  accounts, 
  onManualClick, 
  onScannerClick, 
  onVoiceClick,
  onManageAccounts,
  onViewVisuals
}) => {
  const [insights, setInsights] = useState<FinancialAnalysis | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const totalBalance = useMemo(() => {
    const total = accounts.reduce((acc, a) => acc + a.currentBalance, 0);
    return Math.round(total * 100) / 100;
  }, [accounts]);
  
  const income = useMemo(() => {
    const total = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
    return Math.round(total * 100) / 100;
  }, [transactions]);
    
  const expenses = useMemo(() => {
    const total = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
    return Math.round(total * 100) / 100;
  }, [transactions]);

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

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-2 gap-4 px-1">
        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-500/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Entradas</span>
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{formatCurrency(income)}</span>
          </div>
        </div>
        <div className="bg-rose-50/50 dark:bg-rose-500/5 p-4 rounded-[2rem] border border-rose-100/50 dark:border-rose-500/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">Saídas</span>
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{formatCurrency(expenses)}</span>
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
