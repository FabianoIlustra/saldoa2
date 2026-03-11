import React, { useState, useMemo } from 'react';
import { RecurringTransaction, Transaction, Category, Account } from '../types';
import { CheckCircle, XCircle, AlertCircle, Calendar, Edit2, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format, isSameMonth, isSameYear, parseISO, isBefore, isAfter, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterBar, { FilterState } from './FilterBar';

interface ValidationProps {
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[]; // To check if already paid
  onValidate: (transaction: Omit<Transaction, 'id' | 'isTemplate'>) => void;
  currentDate: Date;
  categories: Category[];
  accounts: Account[];
}

type SortField = 'dueDate' | 'description' | 'category' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const TransactionValidation: React.FC<ValidationProps> = ({ recurringTransactions, transactions, onValidate, currentDate: initialDate, categories, accounts }) => {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [statusFilters, setStatusFilters] = useState<('PENDING' | 'LATE' | 'PAID')[]>(['PENDING', 'LATE']);
  
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Generate expected transactions for the current month (based on FilterBar date)
  const expectedTransactions = useMemo(() => {
    // Use date from filters if available, otherwise initialDate
    const targetDate = currentFilters ? currentFilters.currentDate : initialDate;
    
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    
    return recurringTransactions.filter(r => r.active).map(rec => {
      // Check if already paid in this month
      // Prioritize recurringTransactionId, fallback to description match
      const isPaid = transactions.some(t => {
        if (t.recurringTransactionId === rec.id) {
            const tDate = parseISO(t.date);
            return isSameMonth(tDate, targetDate) && isSameYear(tDate, targetDate);
        }
        // Fallback for legacy or manual matches without ID
        return t.description === rec.description && 
               isSameMonth(parseISO(t.date), targetDate) &&
               isSameYear(parseISO(t.date), targetDate);
      });

      // Determine status
      const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), rec.dayOfMonth);
      let status: 'pending' | 'late' | 'paid' = 'pending';
      
      if (isPaid) status = 'paid';
      else if (isBefore(dueDate, new Date()) && !isSameMonth(dueDate, new Date())) status = 'late'; 
      else if (isBefore(dueDate, new Date()) && !isPaid) status = 'late';

      return {
        ...rec,
        dueDate,
        status
      };
    })
    .filter(item => {
        // Apply FilterBar filters
        if (currentFilters) {
            // Search
            const matchesSearch = item.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                                 item.category.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());
            
            // Type
            const matchesType = currentFilters.type === 'ALL' || item.type === currentFilters.type;
            
            // Categories
            const matchesCategory = currentFilters.categories.length === 0 || currentFilters.categories.includes(item.category);
            
            // Accounts
            const matchesAccount = currentFilters.accounts.length === 0 || currentFilters.accounts.includes(item.accountId);

            if (!matchesSearch || !matchesType || !matchesCategory || !matchesAccount) return false;
        }

        // Apply Status Filters
        if (statusFilters.length > 0) {
            if (item.status === 'pending' && !statusFilters.includes('PENDING')) return false;
            if (item.status === 'late' && !statusFilters.includes('LATE')) return false;
            if (item.status === 'paid' && !statusFilters.includes('PAID')) return false;
        }

        return true;
    })
    .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
            case 'dueDate':
                comparison = a.dueDate.getTime() - b.dueDate.getTime();
                break;
            case 'description':
                comparison = a.description.localeCompare(b.description);
                break;
            case 'category':
                comparison = a.category.localeCompare(b.category);
                break;
            case 'amount':
                comparison = a.amount - b.amount;
                break;
            case 'status':
                comparison = a.status.localeCompare(b.status);
                break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [recurringTransactions, transactions, currentFilters, initialDate, statusFilters, sortField, sortDirection]);

  const handleClick = (item: any) => {
    if (item.status === 'paid') return;
    setSelectedItem(item);
    setEditAmount(item.amount.toString());
    setEditDate(format(item.dueDate, 'yyyy-MM-dd'));
  };

  const handleConfirm = () => {
    if (!selectedItem) return;
    
    onValidate({
      userId: selectedItem.userId,
      accountId: selectedItem.accountId,
      description: selectedItem.description,
      amount: parseFloat(editAmount),
      type: selectedItem.type,
      category: selectedItem.category,
      date: editDate,
      recurrence: 'NONE', // It becomes a real one-time transaction
      isJoint: selectedItem.isJoint,
      recurringTransactionId: selectedItem.id // Link to the recurring rule
    });
    
    setSelectedItem(null);
  };

  const toggleStatusFilter = (status: 'PENDING' | 'LATE' | 'PAID') => {
      setStatusFilters(prev => 
          prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
      );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      <FilterBar 
        categories={categories}
        accounts={accounts}
        onFilterChange={setCurrentFilters}
      />

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
          <button 
            onClick={() => toggleStatusFilter('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                statusFilters.includes('PENDING') 
                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            A Vencer
          </button>
          <button 
            onClick={() => toggleStatusFilter('LATE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                statusFilters.includes('LATE') 
                ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' 
                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            Vencido
          </button>
          <button 
            onClick={() => toggleStatusFilter('PAID')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                statusFilters.includes('PAID') 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            Pago
          </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-indigo-500" />
            Validar
          </h2>
          <p className="text-slate-400 text-sm mt-1">Confirme os pagamentos recorrentes deste mês.</p>
        </div>

        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('status')}>
                            <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                        </th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('dueDate')}>
                            <div className="flex items-center gap-1">Vencimento <SortIcon field="dueDate" /></div>
                        </th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('description')}>
                            <div className="flex items-center gap-1">Descrição <SortIcon field="description" /></div>
                        </th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('category')}>
                            <div className="flex items-center gap-1">Categoria <SortIcon field="category" /></div>
                        </th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-right" onClick={() => handleSort('amount')}>
                            <div className="flex items-center gap-1 justify-end">Valor <SortIcon field="amount" /></div>
                        </th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                            Ação
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expectedTransactions.map((item, idx) => (
                        <tr 
                            key={idx} 
                            className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.status === 'paid' ? 'opacity-50 grayscale' : ''}`}
                        >
                            <td className="p-4">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                                    item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                    item.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {item.status === 'paid' ? 'Pago' : item.status === 'late' ? 'Vencido' : 'A Vencer'}
                                </span>
                            </td>
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                {format(item.dueDate, 'dd/MM/yyyy')}
                            </td>
                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                                {item.description}
                            </td>
                            <td className="p-4">
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                    {item.category}
                                </span>
                            </td>
                            <td className={`p-4 font-black text-right ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            </td>
                            <td className="p-4 text-center">
                                {item.status !== 'paid' && (
                                    <button 
                                        onClick={() => handleClick(item)}
                                        className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
                                        title="Validar Pagamento"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {expectedTransactions.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                Nenhuma conta recorrente encontrada.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50">
            {expectedTransactions.map((item, idx) => (
                <div key={idx} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 ${item.status === 'paid' ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-lg mb-1">{item.description}</span>
                            <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg w-fit">
                                {item.category}
                            </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                            item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'late' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {item.status === 'paid' ? 'Pago' : item.status === 'late' ? 'Vencido' : 'A Vencer'}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</p>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {format(item.dueDate, 'dd/MM/yyyy')}
                            </div>
                        </div>
                        <div className="text-right">
                             <p className={`text-xl font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            </p>
                        </div>
                    </div>

                    {item.status !== 'paid' && (
                        <button 
                            onClick={() => handleClick(item)}
                            className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Validar Pagamento
                        </button>
                    )}
                </div>
            ))}
             {expectedTransactions.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                    <p>Nenhuma conta recorrente encontrada.</p>
                </div>
            )}
        </div>
      </div>


      {/* Validation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Confirmar Lançamento</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                <input 
                  type="text" 
                  value={selectedItem.description} 
                  disabled 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Real</label>
                  <input 
                    type="date" 
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valor Real</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <button 
                onClick={handleConfirm}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 dark:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Check className="w-5 h-5" /> Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionValidation;
