import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Check, X, Printer } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Category, Account, TransactionType } from '../types';

export interface FilterState {
  searchTerm: string;
  type: 'ALL' | TransactionType;
  categories: string[]; // Empty = All
  accounts: string[];   // Empty = All
  dateRange: {
    start: string;
    end: string;
  };
  viewMode: 'MONTH' | 'YEAR' | 'CUSTOM';
  currentDate: Date;
}

interface FilterBarProps {
  categories: Category[];
  accounts: Account[];
  onFilterChange: (filters: FilterState) => void;
  onPrint?: () => void;
  showPrint?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ categories, accounts, onFilterChange, onPrint, showPrint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    type: 'ALL',
    categories: [],
    accounts: [],
    dateRange: {
      start: startOfMonth(new Date()).toISOString(),
      end: endOfMonth(new Date()).toISOString()
    },
    viewMode: 'MONTH',
    currentDate: new Date()
  });

  // Update parent whenever filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleDateNavigate = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subMonths(filters.currentDate, 1) 
      : addMonths(filters.currentDate, 1);
    
    setFilters(prev => ({
      ...prev,
      currentDate: newDate,
      dateRange: {
        start: startOfMonth(newDate).toISOString(),
        end: endOfMonth(newDate).toISOString()
      },
      viewMode: 'MONTH'
    }));
  };

  const toggleCategory = (catName: string) => {
    setFilters(prev => {
      const newCats = prev.categories.includes(catName)
        ? prev.categories.filter(c => c !== catName)
        : [...prev.categories, catName];
      return { ...prev, categories: newCats };
    });
  };

  const toggleAccount = (accId: string) => {
    setFilters(prev => {
      const newAccs = prev.accounts.includes(accId)
        ? prev.accounts.filter(a => a !== accId)
        : [...prev.accounts, accId];
      return { ...prev, accounts: newAccs };
    });
  };

  const setViewMode = (mode: 'MONTH' | 'YEAR' | 'CUSTOM') => {
    let newRange = filters.dateRange;
    if (mode === 'MONTH') {
      newRange = {
        start: startOfMonth(filters.currentDate).toISOString(),
        end: endOfMonth(filters.currentDate).toISOString()
      };
    } else if (mode === 'YEAR') {
      newRange = {
        start: startOfYear(filters.currentDate).toISOString(),
        end: endOfYear(filters.currentDate).toISOString()
      };
    }
    setFilters(prev => ({ ...prev, viewMode: mode, dateRange: newRange }));
  };

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
      {/* Top Row: Search, Date Nav, Print */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative group w-full md:w-64">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar..."
            value={filters.searchTerm}
            onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
          <button onClick={() => handleDateNavigate('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col items-center min-w-[100px]">
             <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">
               {filters.viewMode === 'MONTH' 
                 ? format(filters.currentDate, 'MMMM yyyy', { locale: ptBR })
                 : filters.viewMode === 'YEAR' 
                   ? format(filters.currentDate, 'yyyy', { locale: ptBR })
                   : 'Período'}
             </span>
          </div>

          <button onClick={() => handleDateNavigate('next')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-3 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold ${isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden md:inline">Filtros</span>
          </button>
          
          {showPrint && onPrint && (
            <button 
              onClick={onPrint}
              className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isOpen && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-top-2">
          
          {/* View Mode & Date Range */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Período</label>
            <div className="flex flex-wrap gap-2">
              {(['MONTH', 'YEAR', 'CUSTOM'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                    filters.viewMode === mode 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {mode === 'MONTH' ? 'Mês' : mode === 'YEAR' ? 'Ano' : 'Personalizado'}
                </button>
              ))}
            </div>
            
            {filters.viewMode === 'CUSTOM' && (
              <div className="flex gap-2 mt-2">
                <input 
                  type="date" 
                  value={filters.dateRange.start.split('T')[0]}
                  onChange={e => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: new Date(e.target.value).toISOString() } }))}
                  className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
                />
                <span className="self-center text-slate-400">-</span>
                <input 
                  type="date" 
                  value={filters.dateRange.end.split('T')[0]}
                  onChange={e => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: new Date(e.target.value).toISOString() } }))}
                  className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
                />
              </div>
            )}
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo de Transação</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: 'ALL' }))}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  filters.type === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: 'INCOME' }))}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  filters.type === 'INCOME'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: 'EXPENSE' }))}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  filters.type === 'EXPENSE'
                  ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                }`}
              >
                Despesas
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categorias</label>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
              <button
                  onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                    filters.categories.length === 0
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                    filters.categories.includes(cat.name)
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contas</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                  onClick={() => setFilters(prev => ({ ...prev, accounts: [] }))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                    filters.accounts.length === 0
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
              >
                Todas
              </button>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => toggleAccount(acc.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all flex items-center gap-2 ${
                    filters.accounts.includes(acc.id)
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                  {acc.name}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default FilterBar;
