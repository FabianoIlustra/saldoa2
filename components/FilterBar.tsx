// Force sync
import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Check, X, Printer, ChevronDown } from 'lucide-react';
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
  const [catsOpen, setCatsOpen] = useState(false);
  const [accsOpen, setAccsOpen] = useState(false);
  
  const catRef = useRef<HTMLDivElement>(null);
  const accRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (catRef.current && !catRef.current.contains(target)) {
        setCatsOpen(false);
      }
      if (accRef.current && !accRef.current.contains(target)) {
        setAccsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (!value) return;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) return;

    try {
      const parsedDate = new Date(`${value}T00:00:00`);
      if (!isNaN(parsedDate.getTime())) {
        setFilters(prev => ({
          ...prev,
          dateRange: {
            ...prev.dateRange,
            [type]: parsedDate.toISOString()
          }
        }));
      }
    } catch (e) {
      console.error("Erro ao converter data:", e);
    }
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    }));
  };

  return (
    <div className="space-y-2 bg-white dark:bg-slate-900 p-2 md:p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
      {/* Top Row: Search, Date Nav, Print */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        
        {/* Search */}
        <div className="relative group w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar..."
            value={filters.searchTerm}
            onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 md:py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[11px] md:text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
        </div>

        {/* Date Navigation - Always Visible */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-full">
          {filters.viewMode !== 'CUSTOM' && (
              <>
                <button onClick={() => handleDateNavigate('prev')} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500">
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                
                <div className="flex flex-col items-center min-w-[90px] md:min-w-[120px] px-1">
                    <span className="text-[10px] md:text-xs font-black uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {filters.viewMode === 'MONTH' 
                        ? format(filters.currentDate, 'MMMM yyyy', { locale: ptBR })
                        : format(filters.currentDate, 'yyyy', { locale: ptBR })}
                    </span>
                </div>

                <button onClick={() => handleDateNavigate('next')} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500">
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <div className="flex gap-0.5">
            <button 
                onClick={() => setViewMode('MONTH')}
                className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${filters.viewMode === 'MONTH' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Mês
            </button>
            <button 
                onClick={() => setViewMode('YEAR')}
                className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${filters.viewMode === 'YEAR' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Ano
            </button>
            <button 
                onClick={() => setViewMode('CUSTOM')}
                className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${filters.viewMode === 'CUSTOM' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Período (De/Até)
            </button>
          </div>
        </div>

        {/* Actions */}
        {showPrint && onPrint && (
          <div className="hidden sm:flex gap-1">
            <button 
              onClick={onPrint}
              className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-xl transition-all"
              title="Imprimir"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Custom Date Inputs */}
      {filters.viewMode === 'CUSTOM' && (
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-indigo-50/50 dark:bg-slate-800/40 border border-indigo-100/50 dark:border-slate-700/40 p-3 rounded-xl animate-in fade-in slide-in-from-top-1">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">De</span>
                      <input 
                        type="date" 
                        value={filters.dateRange.start.split('T')[0]}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                        className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                      />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Até</span>
                      <input 
                        type="date" 
                        value={filters.dateRange.end.split('T')[0]}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                      />
                  </div>
              </div>
              <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                  <button 
                    onClick={() => setQuickRange(7)}
                    className="px-2 py-1 text-[9px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
                  >
                    7 Dias
                  </button>
                  <button 
                    onClick={() => setQuickRange(15)}
                    className="px-2 py-1 text-[9px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
                  >
                    15 Dias
                  </button>
                  <button 
                    onClick={() => setQuickRange(30)}
                    className="px-2 py-1 text-[9px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
                  >
                    30 Dias
                  </button>
                  <button 
                    onClick={() => setQuickRange(90)}
                    className="px-2 py-1 text-[9px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
                  >
                    90 Dias
                  </button>
              </div>
          </div>
      )}

      {/* Filters Row - Compact single-row scrollable or 3-column grid on mobile */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-4 pt-1">
          
          {/* Transaction Type */}
          <div className="space-y-1">
            <label className="hidden md:block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo</label>
            <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-2 py-1.5 md:px-4 md:py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[11px] md:text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
                <option value="ALL">Tipo: Todas</option>
                <option value="INCOME">Receitas</option>
                <option value="EXPENSE">Despesas</option>
            </select>
          </div>

          {/* Categories */}
          <div className="space-y-1">
            <label className="hidden md:block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categorias</label>
            <div className="relative" ref={catRef}>
                <button 
                    className="w-full px-2 py-1.5 md:px-4 md:py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[11px] md:text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left flex justify-between items-center"
                    onClick={() => setCatsOpen(!catsOpen)}
                >
                    <span className="truncate">
                      {filters.categories.length === 0 ? 'Cat: Todas' : `${filters.categories.length} Sel.`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
                {catsOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-xl z-50 p-1.5 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        <div 
                            className={`p-1.5 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 ${filters.categories.length === 0 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                            onClick={() => {
                                setFilters(prev => ({ ...prev, categories: [] }));
                                setCatsOpen(false);
                            }}
                        >
                            {filters.categories.length === 0 && <Check className="w-3 h-3" />}
                            <span className="text-[11px]">Todas</span>
                        </div>
                        {categories.map(cat => (
                            <div 
                                key={cat.id}
                                className={`p-1.5 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 ${filters.categories.includes(cat.name) ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                                onClick={() => toggleCategory(cat.name)}
                            >
                                {filters.categories.includes(cat.name) && <Check className="w-3 h-3" />}
                                <span className="text-[11px]">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* Accounts */}
          <div className="space-y-1">
            <label className="hidden md:block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contas</label>
            <div className="relative" ref={accRef}>
                <button 
                    className="w-full px-2 py-1.5 md:px-4 md:py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[11px] md:text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left flex justify-between items-center"
                    onClick={() => setAccsOpen(!accsOpen)}
                >
                    <span className="truncate">
                      {filters.accounts.length === 0 ? 'Contas: Todas' : `${filters.accounts.length} Sel.`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
                {accsOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-xl z-50 p-1.5 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        <div 
                            className={`p-1.5 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 ${filters.accounts.length === 0 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                            onClick={() => {
                                setFilters(prev => ({ ...prev, accounts: [] }));
                                setAccsOpen(false);
                            }}
                        >
                            {filters.accounts.length === 0 && <Check className="w-3 h-3" />}
                            <span className="text-[11px]">Todas</span>
                        </div>
                        {accounts.map(acc => (
                            <div 
                                key={acc.id}
                                className={`p-1.5 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 ${filters.accounts.includes(acc.id) ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
                                onClick={() => toggleAccount(acc.id)}
                            >
                                {filters.accounts.includes(acc.id) && <Check className="w-3 h-3" />}
                                <span className="text-[11px]">{acc.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

      </div>
    </div>
  );
};

export default FilterBar;
