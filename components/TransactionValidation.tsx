import React, { useState, useMemo } from 'react';
import { RecurringTransaction, Transaction, Category, Account } from '../types';
import { CheckCircle, XCircle, AlertCircle, Calendar, Edit2, Check, X, ArrowUpDown, ArrowUp, ArrowDown, CreditCard, CalendarCheck, Plus, Trash2, Lock, Repeat, Clock, Sparkles } from 'lucide-react';
import { format, isSameMonth, isSameYear, parseISO, isBefore, isAfter, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterBar, { FilterState } from './FilterBar';

interface ValidationProps {
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[]; // To check if already paid
  onValidate: (transaction: Omit<Transaction, 'id' | 'isTemplate'>) => void;
  onDelete: (id: string) => void;
  currentDate: Date;
  categories: Category[];
  accounts: Account[];
  onAddRecurring?: (rec: Omit<RecurringTransaction, 'id' | 'lastGeneratedDate' | 'active'>) => void;
  onUpdateRecurring?: (rec: RecurringTransaction) => void;
  onDeleteRecurring?: (id: string) => void;
  currentUserProfile?: any;
}

type SortField = 'dueDate' | 'description' | 'category' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const TransactionValidation: React.FC<ValidationProps> = ({ 
  recurringTransactions, 
  transactions, 
  onValidate, 
  onDelete, 
  currentDate: initialDate, 
  categories, 
  accounts,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  currentUserProfile
}) => {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [editToAccountId, setEditToAccountId] = useState<string>('');
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [statusFilters, setStatusFilters] = useState<('PENDING' | 'LATE' | 'PAID')[]>(['PENDING', 'LATE']);
  
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Estados para nova/edição de recorrência
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<RecurringTransaction | null>(null);
  
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [recCategory, setRecCategory] = useState('');
  const [recDay, setRecDay] = useState('10');
  const [recAccount, setRecAccount] = useState('');
  const [recToAccount, setRecToAccount] = useState('');
  const [recIsJoint, setRecIsJoint] = useState(true);
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Collapsible section for rules management
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const openNewRecurringModal = () => {
    setRecDesc('');
    setRecAmount('');
    setRecType('EXPENSE');
    setRecCategory(categories[0]?.name || '');
    setRecDay('10');
    setRecAccount(accounts[0]?.id || '');
    setRecToAccount('');
    setRecIsJoint(true);
    setRecStartDate(new Date().toISOString().split('T')[0]);
    setRecurringToEdit(null);
    setIsFormOpen(true);
  };

  const openEditRecurringModal = (rec: RecurringTransaction) => {
    setRecurringToEdit(rec);
    setRecDesc(rec.description);
    setRecAmount(rec.amount.toString());
    setRecType(rec.type);
    setRecCategory(rec.category);
    setRecDay(rec.dayOfMonth.toString());
    setRecAccount(rec.accountId);
    setRecToAccount(rec.toAccountId || '');
    setRecIsJoint(rec.isJoint);
    setRecStartDate(rec.startDate || new Date().toISOString().split('T')[0]);
    setIsFormOpen(true);
  };

  const handleRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recDesc || !recAmount || !recAccount) return;
    if (recType === 'TRANSFER' && !recToAccount) return;

    if (recurringToEdit) {
      if (onUpdateRecurring) {
        onUpdateRecurring({
          ...recurringToEdit,
          description: recDesc,
          amount: parseFloat(recAmount),
          type: recType,
          category: recType === 'TRANSFER' ? 'Transferência' : recCategory,
          dayOfMonth: parseInt(recDay),
          accountId: recAccount,
          toAccountId: recType === 'TRANSFER' ? recToAccount : undefined,
          isJoint: recIsJoint,
          startDate: recStartDate
        });
      }
    } else {
      if (onAddRecurring) {
        onAddRecurring({
          description: recDesc,
          amount: parseFloat(recAmount),
          type: recType,
          category: recType === 'TRANSFER' ? 'Transferência' : recCategory,
          dayOfMonth: parseInt(recDay),
          accountId: recAccount,
          toAccountId: recType === 'TRANSFER' ? recToAccount : undefined,
          userId: 'default',
          isJoint: recIsJoint,
          startDate: recStartDate
        });
      }
    }
    setIsFormOpen(false);
  };

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
    
    return recurringTransactions.filter(r => {
      if (!r.active) return false;
      if (r.startDate) {
        const start = parseISO(r.startDate);
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        
        if (startYear > targetYear) return false;
        if (startYear === targetYear && startMonth > targetMonth) return false;
      }
      return true;
    }).map(rec => {
      // Check if already paid in this month
      // Use description and amount match since DB column is missing
      let paidTransactionId: string | undefined;
      const isPaid = transactions.some(t => {
        const tDate = parseISO(t.date);
        const matches = t.description === rec.description && 
               isSameMonth(tDate, targetDate) &&
               isSameYear(tDate, targetDate);
        
        if (matches) {
          paidTransactionId = t.id;
        }
        return matches;
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
        status,
        paidTransactionId
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

  const totals = useMemo(() => {
    return expectedTransactions.reduce((acc, item) => {
      if (item.type === 'INCOME') acc.income += item.amount;
      else acc.expense += item.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [expectedTransactions]);

  const handleClick = (item: any) => {
    if (item.status === 'paid') return;
    setSelectedItem(item);
    setEditAmount(item.amount.toString());
    setEditDate(format(item.dueDate, 'yyyy-MM-dd'));
    setEditAccountId(item.accountId);
    setEditToAccountId(item.toAccountId || '');
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;
    if (!editAccountId) {
      alert('Por favor, selecione uma conta.');
      return;
    }
    
    if (selectedItem.type === 'TRANSFER' && !editToAccountId) {
        alert('Por favor, selecione a conta de destino.');
        return;
    }

    try {
      await onValidate({
        userId: selectedItem.userId,
        accountId: editAccountId,
        toAccountId: selectedItem.type === 'TRANSFER' ? editToAccountId : undefined,
        description: selectedItem.description,
        amount: parseFloat(editAmount),
        type: selectedItem.type,
        category: selectedItem.type === 'TRANSFER' ? 'Transferência' : selectedItem.category,
        date: editDate,
        recurrence: 'NONE', // It becomes a real one-time transaction
        isJoint: selectedItem.isJoint
      });
      setSelectedItem(null);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleIgnoreMonth = async (item: any) => {
    if (confirm('Deseja ignorar este lançamento apenas para este mês? A regra recorrente continuará ativa para os próximos meses.')) {
        try {
            await onValidate({
              userId: item.userId,
              accountId: accounts[0]?.id || 'default',
              description: item.description,
              amount: 0, // Mark as 0 so it counts as "processed" but doesn't affect balances much
              type: item.type,
              category: 'Ignorado',
              date: format(item.dueDate, 'yyyy-MM-dd'),
              recurrence: 'NONE',
              isJoint: item.isJoint
            });
        } catch (error) {
            console.error('Ignore error:', error);
        }
    }
  };

  const toggleStatusFilter = (status: 'PENDING' | 'LATE' | 'PAID') => {
      setStatusFilters(prev => 
          prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
      );
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const targetDate = currentFilters ? currentFilters.currentDate : initialDate;
    const monthYear = format(targetDate, 'MMMM yyyy', { locale: ptBR });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Contas a Pagar - ${monthYear}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; line-height: 1.2; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
            .header p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
            
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 9px; }
            td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            tr:last-child td { border-bottom: none; }
            
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .text-emerald { color: #059669; }
            .text-rose { color: #e11d48; }
            .text-slate { color: #64748b; }
            .status-paid { color: #059669; font-weight: 900; }
            .status-late { color: #e11d48; font-weight: 900; }
            .status-pending { color: #2563eb; font-weight: 900; }
            
            .totals { margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
            .total-row { display: flex; justify-content: space-between; width: 250px; font-size: 12px; }
            .total-row.final { font-size: 14px; font-weight: 900; margin-top: 5px; padding-top: 5px; border-top: 1px solid #e2e8f0; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Contas a Pagar</h1>
            <p>Referência: ${monthYear}</p>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Status</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${expectedTransactions.map(t => `
                <tr>
                  <td class="text-slate">${format(t.dueDate, 'dd/MM/yyyy')}</td>
                  <td class="font-bold">${t.description}</td>
                  <td class="text-slate">${t.category}</td>
                  <td class="status-${t.status}">${t.status === 'paid' ? 'PAGO' : t.status === 'late' ? 'VENCIDO' : 'A VENCER'}</td>
                  <td class="text-right font-bold ${t.type === 'INCOME' ? 'text-emerald' : 'text-rose'}">
                    ${t.type === 'INCOME' ? '+' : '-'} ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
             <div class="total-row final">
                <span>Total Previsto</span>
                <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedTransactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0))}</span>
             </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />;
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      
      <FilterBar 
        categories={categories}
        accounts={accounts}
        onFilterChange={setCurrentFilters}
        onPrint={handlePrint}
        showPrint={true}
      />

      {/* Header, Stats & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-500" />
            Lançamentos Recorrentes
          </h2>
          <p className="text-slate-400 text-[11px] mt-0.5">Gerencie e confirme suas transações recorrentes automáticas para este mês.</p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={openNewRecurringModal}
            className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 dark:shadow-none"
          >
            <Plus className="w-4 h-4" /> Novo Recorrente
          </button>
          <button 
            onClick={() => setIsRulesOpen(!isRulesOpen)}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
              isRulesOpen 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
            }`}
          >
            <Repeat className="w-4 h-4" /> {isRulesOpen ? 'Ocultar Regras' : 'Gerenciar Regras'}
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="max-w-xs">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-rose-600">
            <XCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Despesas Previstas</p>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}
            </h4>
          </div>
        </div>
      </div>

      {/* Rules Collapsible Section */}
      {isRulesOpen && (
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Regras de Automação Recorrentes Ativas
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {recurringTransactions.length} {recurringTransactions.length === 1 ? 'regra' : 'regras'}
            </span>
          </div>

          {recurringTransactions.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-4">Nenhuma regra de automação cadastrada.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {recurringTransactions.map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${rec.type === 'INCOME' ? 'bg-emerald-500' : rec.type === 'TRANSFER' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-white leading-tight">{rec.description}</p>
                      <p className="text-[10px] text-slate-400">Dia {rec.dayOfMonth} • {rec.category} {rec.isJoint ? '• Família' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-xs ${rec.type === 'INCOME' ? 'text-emerald-600' : rec.type === 'TRANSFER' ? 'text-blue-600' : 'text-rose-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.amount)}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditRecurringModal(rec)} 
                        className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Editar Regra"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (onDeleteRecurring && confirm('Excluir esta regra de automação? Os lançamentos confirmados no extrato não serão afetados.')) {
                            onDeleteRecurring(rec.id);
                          }
                        }} 
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Excluir Regra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Filters */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          <button 
            onClick={() => toggleStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                statusFilters.includes('PENDING') 
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40' 
                : 'bg-white text-slate-400 border-slate-100 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            A Vencer
          </button>
          <button 
            onClick={() => toggleStatusFilter('LATE')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                statusFilters.includes('LATE') 
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/40' 
                : 'bg-white text-slate-400 border-slate-100 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            Vencido
          </button>
          <button 
            onClick={() => toggleStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                statusFilters.includes('PAID') 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40' 
                : 'bg-white text-slate-400 border-slate-100 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            Confirmado
          </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
                        <th className="px-3.5 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('status')}>
                            <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                        </th>
                        <th className="px-3.5 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('dueDate')}>
                            <div className="flex items-center gap-1">Vencimento <SortIcon field="dueDate" /></div>
                        </th>
                        <th className="px-3.5 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('description')}>
                            <div className="flex items-center gap-1">Descrição <SortIcon field="description" /></div>
                        </th>
                        <th className="px-3.5 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('category')}>
                            <div className="flex items-center gap-1">Categoria <SortIcon field="category" /></div>
                        </th>
                        <th className="px-3.5 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-right" onClick={() => handleSort('amount')}>
                            <div className="flex items-center gap-1 justify-end">Valor <SortIcon field="amount" /></div>
                        </th>
                        <th className="px-3.5 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                            Ações
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expectedTransactions.map((item, idx) => (
                        <tr 
                            key={idx} 
                            className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.status === 'paid' ? 'opacity-50 grayscale' : ''}`}
                        >
                            <td className="px-3.5 py-2.5">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                    item.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {item.status === 'paid' ? 'Pago' : item.status === 'late' ? 'Vencido' : 'A Vencer'}
                                </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-xs text-slate-700 dark:text-slate-300">
                                {format(item.dueDate, 'dd/MM/yyyy')}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-xs text-slate-900 dark:text-white">
                                {item.description}
                            </td>
                            <td className="px-3.5 py-2.5">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    {item.category}
                                </span>
                            </td>
                            <td className={`px-3.5 py-2.5 font-black text-xs text-right ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            </td>
                            <td className="px-3.5 py-2.5">
                                <div className="flex items-center justify-center gap-2">
                                    {item.status !== 'paid' ? (
                                        <>
                                            <button 
                                                onClick={() => handleClick(item)}
                                                className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                title="Confirmar/Editar Lançamento"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleIgnoreMonth(item)}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg"
                                                title="Ignorar este mês"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                if (item.paidTransactionId && confirm('Deseja estornar este pagamento? O lançamento será removido do extrato.')) {
                                                    onDelete(item.paidTransactionId);
                                                }
                                            }}
                                            className="bg-rose-100 text-rose-600 p-1.5 rounded-lg hover:bg-rose-200 transition-colors"
                                            title="Estornar Pagamento"
                                        >
                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {expectedTransactions.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                                Nenhuma conta recorrente encontrada.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-2 p-2 bg-slate-50 dark:bg-slate-900/50">
            {expectedTransactions.map((item, idx) => (
                <div key={idx} className={`bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 ${item.status === 'paid' ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-sm mb-0.5 leading-tight">{item.description}</span>
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md w-fit">
                                {item.category}
                            </span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'late' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {item.status === 'paid' ? 'Pago' : item.status === 'late' ? 'Vencido' : 'A Vencer'}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {format(item.dueDate, 'dd/MM/yyyy')}
                            </div>
                        </div>
                        <div className="text-right">
                             <p className={`text-sm font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            </p>
                        </div>
                    </div>

                    {item.status !== 'paid' ? (
                        <div className="flex gap-2 mt-2.5">
                            <button 
                                onClick={() => handleClick(item)}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                                <Check className="w-3.5 h-3.5" /> Confirmar
                            </button>
                            <button 
                                onClick={() => handleIgnoreMonth(item)}
                                className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg hover:text-rose-500 transition-colors"
                                title="Ignorar este mês"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => {
                                if (item.paidTransactionId && confirm('Deseja estornar este pagamento? O lançamento será removido do extrato.')) {
                                    onDelete(item.paidTransactionId);
                                }
                            }}
                            className="w-full mt-2.5 bg-rose-50 text-rose-600 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <ArrowUpDown className="w-3.5 h-3.5" /> Estornar Pagamento
                        </button>
                    )}
                </div>
            ))}
             {expectedTransactions.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                    <p>Nenhuma conta recorrente encontrada.</p>
                </div>
            )}
        </div>
      </div>


      {/* Rules Creation & Edition Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Promo Subscription Lock Gate overlay if plan is blocked */}
            {(!currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico') && (
              <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl z-10 flex flex-col items-center justify-center p-6 text-center">
                <Lock className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-3" />
                <span className="text-base font-black uppercase text-slate-800 dark:text-white">Automações Recorrentes Bloqueadas</span>
                <span className="text-xs text-slate-400 mt-1.5 max-w-sm">Assine o plano Médio ou Premium para automatizar seus lançamentos de contas fixas todos os meses.</span>
                <button 
                  onClick={() => {
                    setIsFormOpen(false);
                    document.getElementById('trigger-subscription-modal')?.click();
                  }}
                  className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  Conhecer Planos & Upgrade
                </button>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="mt-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Voltar
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {recurringToEdit ? 'Editar Regra Recorrente' : 'Cadastrar Conta Recorrente'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRecurringSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: Aluguel, Academia, Netflix..." 
                  value={recDesc}
                  onChange={e => setRecDesc(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00" 
                    value={recAmount}
                    onChange={e => setRecAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Dia do Mês</label>
                  <select 
                    value={recDay}
                    onChange={e => setRecDay(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                  >
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Data de Início</label>
                  <input 
                    type="date" 
                    value={recStartDate}
                    onChange={e => setRecStartDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Categoria</label>
                  <select 
                    value={recCategory}
                    onChange={e => setRecCategory(e.target.value)}
                    disabled={recType === 'TRANSFER'}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                  >
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tipo</label>
                <div className="flex bg-slate-50 dark:bg-slate-800 rounded-xl p-1 gap-1">
                  <button type="button" onClick={() => setRecType('EXPENSE')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${recType === 'EXPENSE' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>Despesa</button>
                  <button type="button" onClick={() => setRecType('INCOME')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${recType === 'INCOME' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Receita</button>
                  <button type="button" onClick={() => {
                    setRecType('TRANSFER');
                    setRecCategory('Transferência');
                  }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${recType === 'TRANSFER' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>Transf.</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">
                    {recType === 'TRANSFER' ? 'Origem' : 'Conta'}
                  </label>
                  <select 
                    value={recAccount}
                    onChange={e => setRecAccount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {recType === 'TRANSFER' ? (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Destino</label>
                    <select 
                      value={recToAccount}
                      onChange={e => setRecToAccount(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold dark:text-white"
                    >
                      <option value="">Destino...</option>
                      {accounts.filter(a => a.id !== recAccount).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={recIsJoint} onChange={e => setRecIsJoint(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Lançamento Família</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Confirmation Modal (Allows "Editing" for the current monthly instance) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Confirmar Lançamento</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">
                    {selectedItem.type === 'TRANSFER' ? 'Conta de Origem' : 'Vincular a qual conta?'}
                </label>
                <div className="relative">
                  <select 
                    value={editAccountId}
                    onChange={e => setEditAccountId(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                  >
                    <option value="" disabled>Selecione uma conta</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                    ))}
                  </select>
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {selectedItem.type === 'TRANSFER' && (
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Conta de Destino</label>
                    <div className="relative">
                        <select 
                            value={editToAccountId}
                            onChange={e => setEditToAccountId(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                        >
                            <option value="">Selecione a conta de destino</option>
                            {accounts.filter(a => a.id !== editAccountId).map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.type})
                                </option>
                            ))}
                        </select>
                        <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Descrição</label>
                <input 
                  type="text" 
                  value={selectedItem.description} 
                  disabled 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Data Real</label>
                  <input 
                    type="date" 
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Valor Real</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-white"
                  />
                </div>
              </div>

              <button 
                onClick={handleConfirm}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-extrabold uppercase tracking-wider text-[11px] shadow-md shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-1.5 mt-3"
              >
                <Check className="w-4 h-4" /> Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionValidation;
