
import React, { useState, useMemo } from 'react';
import { Transaction, User, Account, Category } from '../types';
import { Trash2, Search, ShoppingCart, Home, Car, Utensils, Heart, Briefcase, GraduationCap, PlusCircle, Repeat, User as UserIcon, Filter, ArrowUpCircle, ArrowDownCircle, Wallet, Printer, Upload } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterBar, { FilterState } from './FilterBar';
import PrintPreviewModal from './PrintPreviewModal';

interface TransactionListProps {
  transactions: Transaction[];
  users: User[];
  accounts: Account[];
  categories: Category[];
  onDelete: (id: string) => void;
  onOpenImporter: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Alimentação': return <Utensils className="w-4 h-4" />;
    case 'Moradia': return <Home className="w-4 h-4" />;
    case 'Transporte': return <Car className="w-4 h-4" />;
    case 'Lazer': return <ShoppingCart className="w-4 h-4" />;
    case 'Saúde': return <Heart className="w-4 h-4" />;
    case 'Educação': return <GraduationCap className="w-4 h-4" />;
    case 'Investimentos': return <Briefcase className="w-4 h-4" />;
    case 'Salário': return <PlusCircle className="w-4 h-4" />;
    default: return <PlusCircle className="w-4 h-4" />;
  }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, users, accounts, categories, onDelete, onOpenImporter }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (!currentFilters) return transactions;

    return transactions
      .filter(t => {
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
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentFilters]);

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
    
    // Fix floating point precision
    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      total: Math.round((income - expense) * 100) / 100
    };
  }, [filteredTransactions]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const getUserColor = (userId: string) => {
    return users.find(u => u.id === userId)?.avatarColor || '#cbd5e1';
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Conta';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print:space-y-0">
      
      <div className="print:hidden">
        <FilterBar 
          categories={categories}
          accounts={accounts}
          onFilterChange={setCurrentFilters}
          onPrint={handlePrint}
          showPrint={true}
        />
      </div>

      {/* Import Button (Mobile/Desktop) - Hidden on Print */}
      <div className="flex justify-end print:hidden gap-2">
         <button 
            onClick={onOpenImporter}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Extrato</span>
          </button>
      </div>

      {/* Lista de Transações */}
      <div className="space-y-2 print:space-y-1">
        {filteredTransactions.length === 0 ? (
          <div className="py-20 text-center space-y-4 print:hidden">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto transition-colors">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum resultado para estes filtros</p>
          </div>
        ) : (
          <>
            {filteredTransactions.map((t) => (
              <div 
                key={t.id} 
                className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 group transition-all hover:shadow-md print:border-slate-200 print:shadow-none print:rounded-none print:border-b"
              >
                {/* Ícone Categoria - Compact */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors print:hidden">
                  {getCategoryIcon(t.category)}
                </div>

                {/* Info Central */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs md:text-sm">
                        {t.description}
                        {t.isJoint && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Conjunto</span>}
                    </h4>
                    {t.recurrence === 'MONTHLY' && <Repeat className="w-3 h-3 text-indigo-400 print:hidden" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                      {format(new Date(t.date), 'dd MMM yyyy', { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-1 print:hidden">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getUserColor(t.userId) }} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {users.find(u => u.id === t.userId)?.name.split(' ')[0]}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded print:bg-transparent print:p-0">
                      {t.category}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded print:bg-transparent print:p-0">
                      {getAccountName(t.accountId)}
                    </span>
                  </div>
                </div>

                {/* Valor e Ações */}
                <div className="text-right flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm md:text-base font-black ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'} print:text-black`}>
                      {t.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                    </span>
                  </div>
                  <button 
                    onClick={() => onDelete(t.id)}
                    className="p-2 text-slate-200 dark:text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 active:opacity-100 print:hidden"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer Totals */}
      <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 p-4 md:p-6 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] print:static print:shadow-none print:border-t-2 print:border-black">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
           <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Receitas</p>
              <p className="text-emerald-500 font-black text-sm md:text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}</p>
           </div>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
           <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Despesas</p>
              <p className="text-rose-500 font-black text-sm md:text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}</p>
           </div>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
           <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo</p>
              <p className={`font-black text-sm md:text-xl ${totals.total >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}
              </p>
           </div>
        </div>
      </div>

      {isPrintModalOpen && (
        <PrintPreviewModal 
          transactions={filteredTransactions}
          users={users}
          accounts={accounts}
          categories={categories}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

export default TransactionList;
