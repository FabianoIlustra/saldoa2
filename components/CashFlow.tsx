import React, { useState, useMemo } from 'react';
import { Transaction, Account, Category } from '../types';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import FilterBar, { FilterState } from './FilterBar';
import { parseISO } from 'date-fns';

interface CashFlowProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

const CashFlow: React.FC<CashFlowProps> = ({ transactions, accounts, categories }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);

  // Filter transactions based on FilterBar state
  const filteredTransactions = useMemo(() => {
    if (!currentFilters) return transactions;

    return transactions.filter(t => {
        // Search
        const matchesSearch = t.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                             t.category.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());
        
        // Type
        const matchesType = currentFilters.type === 'ALL' || t.type === currentFilters.type;
        
        // Categories (Multi-select)
        const matchesCategory = currentFilters.categories.length === 0 || currentFilters.categories.includes(t.category);
        
        // Accounts (Multi-select)
        const matchesAccount = currentFilters.accounts.length === 0 || currentFilters.accounts.includes(t.accountId);
        
        // Date Range
        const tDate = parseISO(t.date);
        const matchesDate = !currentFilters.dateRange.start || !currentFilters.dateRange.end || (
            tDate >= parseISO(currentFilters.dateRange.start) && 
            tDate <= parseISO(currentFilters.dateRange.end)
        );

        return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesDate;
    });
  }, [transactions, currentFilters]);

  // Calculate totals
  const totalBalance = useMemo(() => {
      // Balance should reflect selected accounts if any, otherwise all
      const targetAccounts = currentFilters && currentFilters.accounts.length > 0 
        ? accounts.filter(a => currentFilters.accounts.includes(a.id)) 
        : accounts;
      return targetAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  }, [accounts, currentFilters]);

  const income = useMemo(() => filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);
  const expense = useMemo(() => filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);

  // Group by category for DRE view
  const incomeByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'INCOME').forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [filteredTransactions]);

  const expenseByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [filteredTransactions]);

  const [activeView, setActiveView] = useState<'DEMONSTRATIVO' | 'RESUMIDO' | 'DRE'>('DEMONSTRATIVO');

  // ... existing memos ...

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <FilterBar 
        categories={categories}
        accounts={accounts}
        onFilterChange={setCurrentFilters}
      />

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {[
          { id: 'DEMONSTRATIVO', label: 'Demonstrativo' },
          { id: 'RESUMIDO', label: 'Extrato Resumido' },
          { id: 'DRE', label: 'DRE Operacional' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeView === tab.id 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {activeView === 'DEMONSTRATIVO' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* ... Existing Demonstrativo Content ... */}
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Demonstrativo Financeiro
            </h2>
            <div className="text-right">
               <p className="text-xs text-slate-400 font-bold uppercase">Saldo Atual Selecionado</p>
               <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalBalance)}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Receitas */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                   <ArrowUpRight className="w-4 h-4" /> Receitas Operacionais
                 </h3>
                 <span className="text-sm font-bold text-emerald-600">{formatCurrency(income)}</span>
              </div>
              <div className="space-y-1 pl-6 border-l-2 border-emerald-100 dark:border-emerald-900/30">
                {incomeByCategory.map(([cat, val]) => (
                  <div key={cat} className="flex justify-between text-xs py-1 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded px-2 transition-colors">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{cat}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200">{formatCurrency(val)}</span>
                  </div>
                ))}
                {incomeByCategory.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma receita no período.</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10 p-3 rounded-xl">
                 <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">Total de Receitas</span>
                 <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">+ {formatCurrency(income)}</span>
              </div>
            </div>

            {/* Despesas */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                   <ArrowDownRight className="w-4 h-4" /> Despesas Operacionais
                 </h3>
                 <span className="text-sm font-bold text-rose-600">{formatCurrency(expense)}</span>
              </div>
              <div className="space-y-1 pl-6 border-l-2 border-rose-100 dark:border-rose-900/30">
                {expenseByCategory.map(([cat, val]) => (
                  <div key={cat} className="flex justify-between text-xs py-1 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 rounded px-2 transition-colors">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{cat}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200">{formatCurrency(val)}</span>
                  </div>
                ))}
                {expenseByCategory.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma despesa no período.</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/10 p-3 rounded-xl">
                 <span className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase">Total de Despesas</span>
                 <span className="text-sm font-black text-rose-700 dark:text-rose-400">- {formatCurrency(expense)}</span>
              </div>
            </div>

            {/* Resultado */}
            <div className="p-8 bg-slate-50 dark:bg-slate-950/50">
               <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Resultado do Período</p>
                    <p className={`text-3xl font-black ${income - expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {income - expense >= 0 ? '+' : ''} {formatCurrency(income - expense)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Margem</p>
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                      {income > 0 ? Math.round(((income - expense) / income) * 100) : 0}%
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'RESUMIDO' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-8">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">Extrato Resumido</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Entradas Totais</p>
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency(income)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Saídas Totais</p>
                    <p className="text-2xl font-black text-rose-600">{formatCurrency(expense)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Saldo do Período</p>
                    <p className={`text-2xl font-black ${income - expense >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {formatCurrency(income - expense)}
                    </p>
                </div>
            </div>
            
            <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wider">Resumo por Conta</h3>
                <div className="space-y-3">
                    {accounts.map(acc => {
                        const accIncome = filteredTransactions.filter(t => t.accountId === acc.id && t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
                        const accExpense = filteredTransactions.filter(t => t.accountId === acc.id && t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                        return (
                            <div key={acc.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <span className="font-bold text-slate-700 dark:text-slate-200">{acc.name}</span>
                                <div className="text-right">
                                    <p className="text-xs text-emerald-600 font-bold">+{formatCurrency(accIncome)}</p>
                                    <p className="text-xs text-rose-600 font-bold">-{formatCurrency(accExpense)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {activeView === 'DRE' && (
        <div className="space-y-6">
            {/* Top Summary Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 border-b border-indigo-100 dark:border-indigo-900/30 pb-2 mb-4">
                    Demonstrativo Financeiro (Operacional)
                </h2>
                
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="font-bold text-slate-700 dark:text-slate-300">(+) Receitas Operacionais</span>
                    <span className="font-black text-emerald-600">{formatCurrency(income)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="font-bold text-slate-700 dark:text-slate-300">(-) Despesas Operacionais</span>
                    <span className="font-black text-rose-600">{formatCurrency(expense)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg mt-2">
                    <span className="font-black text-slate-900 dark:text-white">(=) Resultado Operacional do Período</span>
                    <span className={`font-black text-xl ${income - expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(income - expense)}
                    </span>
                </div>
            </div>

            {/* Side by Side Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Receitas */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" /> Receitas por Categoria
                    </h3>
                    <div className="space-y-3">
                        {incomeByCategory.map(([cat, val]) => (
                            <div key={cat} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase">{cat}</span>
                                <span className="text-sm font-bold text-emerald-600">{formatCurrency(val)}</span>
                            </div>
                        ))}
                         {incomeByCategory.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma receita.</p>}
                    </div>
                </div>

                {/* Despesas */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                    <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4" /> Despesas por Categoria
                    </h3>
                    <div className="space-y-3">
                        {expenseByCategory.map(([cat, val]) => (
                            <div key={cat} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase">{cat}</span>
                                <span className="text-sm font-bold text-rose-600">{formatCurrency(val)}</span>
                            </div>
                        ))}
                        {expenseByCategory.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma despesa.</p>}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CashFlow;
