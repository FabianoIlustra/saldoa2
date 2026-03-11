// Force sync
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
    let newDate = new Date(filters.currentDate);
    
    if (filters.viewMode === 'MONTH') {
        newDate = direction === 'prev' 
          ? subMonths(filters.currentDate, 1) 
          : addMonths(filters.currentDate, 1);
        
        setFilters(prev => ({
          ...prev,
          currentDate: newDate,
          dateRange: {
            start: startOfMonth(newDate).toISOString(),
            end: endOfMonth(newDate).toISOString()
          }
        }));
    } else if (filters.viewMode === 'YEAR') {
        newDate = direction === 'prev' 
          ? subMonths(filters.currentDate, 12) // Subtract 1 year
          : addMonths(filters.currentDate, 12); // Add 1 year
          
         setFilters(prev => ({
          ...prev,
          currentDate: newDate,
          dateRange: {
            start: startOfYear(newDate).toISOString(),
            end: endOfYear(newDate).toISOString()
          }
        }));
    }
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
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative group w-full xl:w-64">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar..."
            value={filters.searchTerm}
            onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
        </div>

        {/* Date Navigation - Always Visible */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto max-w-full">
          {filters.viewMode !== 'CUSTOM' && (
              <>
                <button onClick={() => handleDateNavigate('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-500">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex flex-col items-center min-w-[120px] px-2">
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {filters.viewMode === 'MONTH' 
                        ? format(filters.currentDate, 'MMMM yyyy', { locale: ptBR })
                        : format(filters.currentDate, 'yyyy', { locale: ptBR })}
                    </span>
                </div>

                <button onClick={() => handleDateNavigate('next')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-500">
                    <ChevronRight className="w-4 h-4" />
                </button>
              </>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

          <div className="flex gap-1">
            <button 
                onClick={() => setViewMode('MONTH')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filters.viewMode === 'MONTH' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Mês
            </button>
            <button 
                onClick={() => setViewMode('YEAR')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filters.viewMode === 'YEAR' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Ano
            </button>
            <button 
                onClick={() => setViewMode('CUSTOM')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filters.viewMode === 'CUSTOM' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Período
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
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

      {/* Custom Date Inputs */}
      {filters.viewMode === 'CUSTOM' && (
          <div className="flex gap-4 items-center justify-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">De</span>
                  <input 
                    type="date" 
                    value={filters.dateRange.start.split('T')[0]}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: new Date(e.target.value).toISOString() } }))}
                    className="bg-white dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Até</span>
                  <input 
                    type="date" 
                    value={filters.dateRange.end.split('T')[0]}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: new Date(e.target.value).toISOString() } }))}
                    className="bg-white dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
              </div>
          </div>
      )}

      {/* Filters Row - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Transaction Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo</label>
            <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
                <option value="ALL">Todas</option>
                <option value="INCOME">Receitas</option>
                <option value="EXPENSE">Despesas</option>
            </select>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categorias</label>
            <div className="relative group">
                <button 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left flex justify-between items-center"
                    onClick={(e) => {
                        const next = e.currentTarget.nextElementSibling;
                        next?.classList.toggle('hidden');
                    }}
                >
                    {filters.categories.length === 0 ? 'Todas' : `${filters.categories.length} selecionadas`}
                    <ChevronRight className="w-4 h-4 rotate-90 text-slate-400" />
                </button>
                <div className="hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 max-h-48 overflow-y-auto">
                    <div 
                        className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 ${filters.categories.length === 0 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                        onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                    >
                        {filters.categories.length === 0 && <Check className="w-3 h-3" />}
                        <span className="text-xs">Todas</span>
                    </div>
                    {categories.map(cat => (
                        <div 
                            key={cat.id}
                            className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 ${filters.categories.includes(cat.name) ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                            onClick={() => toggleCategory(cat.name)}
                        >
                            {filters.categories.includes(cat.name) && <Check className="w-3 h-3" />}
                            <span className="text-xs">{cat.name}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Accounts */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contas</label>
            <div className="relative group">
                <button 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left flex justify-between items-center"
                    onClick={(e) => {
                        const next = e.currentTarget.nextElementSibling;
                        next?.classList.toggle('hidden');
                    }}
                >
                    {filters.accounts.length === 0 ? 'Todas' : `${filters.accounts.length} selecionadas`}
                    <ChevronRight className="w-4 h-4 rotate-90 text-slate-400" />
                </button>
                <div className="hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 max-h-48 overflow-y-auto">
                    <div 
                        className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 ${filters.accounts.length === 0 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                        onClick={() => setFilters(prev => ({ ...prev, accounts: [] }))}
                    >
                        {filters.accounts.length === 0 && <Check className="w-3 h-3" />}
                        <span className="text-xs">Todas</span>
                    </div>
                    {accounts.map(acc => (
                        <div 
                            key={acc.id}
                            className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 ${filters.accounts.includes(acc.id) ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                            onClick={() => toggleAccount(acc.id)}
                        >
                            {filters.accounts.includes(acc.id) && <Check className="w-3 h-3" />}
                            <span className="text-xs">{acc.name}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>

      </div>
    </div>
  );
};

export default FilterBar;
