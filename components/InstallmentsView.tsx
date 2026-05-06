import React, { useState, useMemo } from 'react';
import { InstallmentGroup, Transaction, Account, Category } from '../types';
import { format, parseISO, isSameMonth, isSameYear, addMonths, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterBar, { FilterState } from './FilterBar';
import { 
  CreditCard, 
  Trash2, 
  Calendar, 
  Filter, 
  Search, 
  Tag as TagIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  CalendarCheck,
  Check,
  Edit2,
  Printer,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface InstallmentsViewProps {
  installmentGroups: InstallmentGroup[];
  transactions: Transaction[];
  onAdd: (group: Omit<InstallmentGroup, 'id' | 'active'>) => Promise<any>;
  onDelete: (id: string, deleteTransactions: boolean) => void;
  onValidate: (transaction: Omit<Transaction, 'id' | 'isTemplate'>) => void;
  onDeleteTransaction: (id: string) => void;
  accounts: Account[];
  categories: Category[];
}

type SortField = 'dueDate' | 'description' | 'category' | 'installment' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const InstallmentsView: React.FC<InstallmentsViewProps> = ({
  installmentGroups,
  transactions,
  onAdd,
  onDelete,
  onValidate,
  onDeleteTransaction,
  accounts,
  categories
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [deleteGroupConfirmId, setDeleteGroupConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editAccountId, setEditAccountId] = useState<string>('');

  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilters, setStatusFilters] = useState<('PENDING' | 'LATE' | 'PAID')[]>(['PENDING', 'LATE']);

  const [newGroup, setNewGroup] = useState<Omit<InstallmentGroup, 'id' | 'active' | 'userId'>>({
    accountId: accounts[0]?.id || '',
    description: '',
    totalAmount: 0,
    installmentAmount: 0,
    totalInstallments: 2,
    startDate: new Date().toISOString().split('T')[0],
    intervalDays: 30,
    category: categories[0]?.name || 'Outros',
    type: 'EXPENSE'
  });

  const targetDate = currentFilters?.currentDate || new Date();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const monthlyInstallments = useMemo(() => {
    const list: any[] = [];
    const isYearFilter = currentFilters?.viewMode === 'YEAR';
    
    installmentGroups.forEach(group => {
      const baseDate = parseISO(group.startDate);
      
      for (let i = 0; i < group.totalInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(baseDate.getDate() + (i * group.intervalDays));
        
        let shouldInclude = false;
        if (isYearFilter) {
            shouldInclude = dueDate.getFullYear() === targetDate.getFullYear();
        } else {
            shouldInclude = dueDate.getMonth() === targetDate.getMonth() && dueDate.getFullYear() === targetDate.getFullYear();
        }

        if (shouldInclude) {
          const paidRecord = transactions.find(t => 
            t.installmentGroupId === group.id && 
            t.installmentNumber === (i + 1)
          );
          
          let status: 'paid' | 'late' | 'pending' = 'pending';
          if (paidRecord) {
              status = 'paid';
          } else if (isBefore(dueDate, startOfDay(new Date()))) {
              status = 'late';
          }

          list.push({
            ...group,
            installmentNumber: i + 1,
            dueDate,
            status,
            paidTransactionId: paidRecord?.id
          });
        }
      }
    });
    
    // Filtering
    let filtered = list;
    if (currentFilters) {
        filtered = filtered.filter(item => {
            const matchesSearch = item.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                                 item.category.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());
            const matchesCategory = currentFilters.categories.length === 0 || currentFilters.categories.includes(item.category);
            const matchesAccount = currentFilters.accounts.length === 0 || currentFilters.accounts.includes(item.accountId);
            const matchesType = currentFilters.type === 'ALL' || item.type === currentFilters.type;
            
            return matchesSearch && matchesCategory && matchesAccount && matchesType;
        });
    }

    // Status Filtering
    if (statusFilters.length > 0) {
        filtered = filtered.filter(item => {
            if (item.status === 'pending' && !statusFilters.includes('PENDING')) return false;
            if (item.status === 'late' && !statusFilters.includes('LATE')) return false;
            if (item.status === 'paid' && !statusFilters.includes('PAID')) return false;
            return true;
        });
    }

    // Sorting
    return filtered.sort((a, b) => {
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
            case 'installment':
                comparison = a.installmentNumber - b.installmentNumber;
                break;
            case 'amount':
                comparison = a.installmentAmount - b.installmentAmount;
                break;
            case 'status':
                comparison = a.status.localeCompare(b.status);
                break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [installmentGroups, transactions, targetDate, currentFilters, sortField, sortDirection, statusFilters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(newGroup as any);
    setIsFormOpen(false);
    setNewGroup({
      accountId: accounts[0]?.id || '',
      description: '',
      totalAmount: 0,
      installmentAmount: 0,
      totalInstallments: 2,
      startDate: new Date().toISOString().split('T')[0],
      intervalDays: 30,
      category: categories[0]?.name || 'Outros',
      type: 'EXPENSE'
    });
  };

  const handleClick = (item: any) => {
    if (item.status === 'paid') return;
    setSelectedItem(item);
    setEditAmount(item.installmentAmount.toString());
    setEditDate(format(item.dueDate, 'yyyy-MM-dd'));
    setEditAccountId(item.accountId);
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;
    
    try {
      await onValidate({
        userId: selectedItem.userId,
        accountId: editAccountId,
        description: `${selectedItem.description} (${selectedItem.installmentNumber}/${selectedItem.totalInstallments})`,
        amount: parseFloat(editAmount),
        type: selectedItem.type,
        category: selectedItem.category,
        date: editDate,
        recurrence: 'NONE',
        isJoint: selectedItem.isJoint,
        installmentGroupId: selectedItem.id,
        installmentNumber: selectedItem.installmentNumber,
        totalInstallments: selectedItem.totalInstallments
      });
      setSelectedItem(null);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const monthYear = currentFilters?.viewMode === 'YEAR' 
        ? format(targetDate, 'yyyy', { locale: ptBR })
        : format(targetDate, 'MMMM yyyy', { locale: ptBR });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Parcelados - ${monthYear}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; line-height: 1.2; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
            .header p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 9px; }
            td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .text-emerald { color: #059669; }
            .text-rose { color: #e11d48; }
            .status-paid { color: #059669; font-weight: 900; }
            .status-late { color: #e11d48; font-weight: 900; }
            .status-pending { color: #2563eb; font-weight: 900; }
            .totals { margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 10px; display: flex; flex-direction: column; align-items: flex-end; }
            .total-row { font-size: 14px; font-weight: 900; width: 250px; display: flex; justify-content: space-between; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Lançamentos Parcelados</h1>
            <p>Referência: ${monthYear}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Parcela</th>
                <th>Status</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyInstallments.map(t => `
                <tr>
                  <td>${format(t.dueDate, 'dd/MM/yyyy')}</td>
                  <td class="font-bold">${t.description}</td>
                  <td>${t.category}</td>
                  <td style="text-align: center;">${t.installmentNumber}/${t.totalInstallments}</td>
                  <td class="status-${t.status}">${t.status === 'paid' ? 'PAGO' : t.status === 'late' ? 'VENCIDO' : 'A VENCER'}</td>
                  <td class="text-right font-bold ${t.type === 'INCOME' ? 'text-emerald' : 'text-rose'}">
                    ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.installmentAmount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <span>Comprometimento Total</span>
              <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyInstallments.reduce((sum, t) => sum + t.installmentAmount, 0))}</span>
            </div>
          </div>
          <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const calculateInstallment = (total: number, count: number) => {
    if (count <= 0) return 0;
    return Math.round((total / count) * 100) / 100;
  };

  const totalMonthly = monthlyInstallments.reduce((sum, item) => sum + item.installmentAmount, 0);

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
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <FilterBar 
        categories={categories}
        accounts={accounts}
        onFilterChange={setCurrentFilters}
        onPrint={handlePrint}
        showPrint={true}
      />

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => toggleStatusFilter('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                statusFilters.includes('PENDING') 
                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            A Vencer
          </button>
          <button 
            onClick={() => toggleStatusFilter('LATE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                statusFilters.includes('LATE') 
                ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' 
                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            Vencido
          </button>
          <button 
            onClick={() => toggleStatusFilter('PAID')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                statusFilters.includes('PAID') 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            Pagos
          </button>
      </div>

      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {currentFilters?.viewMode === 'YEAR' ? 'Comprometido (Ano)' : 'Comprometido (Mês)'}
            </p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMonthly)}
            </h4>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Parcelas Projetadas</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">{monthlyInstallments.length}</h4>
          </div>
        </div>

        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] p-6 shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Plus className="w-6 h-6" />
          <span className="font-black uppercase text-xs tracking-widest">Novo Parcelamento</span>
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-indigo-500" />
              Contas Parceladas
            </h2>
            <p className="text-slate-400 text-sm mt-1">Lançamentos divididos projetados para o período.</p>
          </div>
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
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('installment')}>
                    <div className="flex items-center justify-center gap-1">Parcela <SortIcon field="installment" /></div>
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-1">Valor <SortIcon field="amount" /></div>
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlyInstallments.map((item, idx) => (
                <tr key={idx} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.status === 'paid' ? 'opacity-50 grayscale' : ''}`}>
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
                  <td className="p-4 text-center">
                    <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">
                      {item.installmentNumber}/{item.totalInstallments}
                    </span>
                  </td>
                  <td className={`p-4 font-black text-right ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.installmentAmount)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {item.status !== 'paid' ? (
                        <button 
                            onClick={() => handleClick(item)}
                            className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
                            title="Lançar no Extrato"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                      ) : (
                         <button 
                            onClick={() => {
                                if (item.paidTransactionId && confirm('Deseja estornar este lançamento do extrato?')) {
                                    onDeleteTransaction(item.paidTransactionId);
                                }
                            }}
                            className="bg-rose-100 text-rose-600 p-2 rounded-xl hover:bg-rose-200 transition-colors"
                            title="Estornar Lançamento"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                        </button>
                      )}
                      
                       <button 
                        onClick={() => setDeleteGroupConfirmId(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-xl"
                        title="Excluir contrato completo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {monthlyInstallments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Nenhuma parcela para este período.
                  </td>
                </tr>
              )}
            </tbody>
            {monthlyInstallments.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-black">
                <tr>
                  <td colSpan={5} className="p-4 text-right text-slate-500 uppercase text-[10px]">Total do Período:</td>
                  <td className="p-4 text-right text-indigo-600 text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMonthly)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Validar Lançamento</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vincular a qual conta?</label>
                <div className="relative">
                  <select 
                    value={editAccountId}
                    onChange={e => setEditAccountId(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 outline-none appearance-none font-bold transition-all"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                    ))}
                  </select>
                  <CreditCard className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                <input 
                  type="text" 
                  value={`${selectedItem.description} (${selectedItem.installmentNumber}/${selectedItem.totalInstallments})`} 
                  disabled 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data de Lançamento</label>
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
                <Check className="w-5 h-5" /> Confirmar no Extrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Installment Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-2xl">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Novo Parcelamento</h3>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Cadastre compras divididas</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder="Ex: Smart TV Samsung 55 polegadas"
                  value={newGroup.description}
                  onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor Total</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newGroup.totalAmount || ''}
                      onChange={e => {
                        const total = parseFloat(e.target.value);
                        setNewGroup({
                          ...newGroup, 
                          totalAmount: total,
                          installmentAmount: calculateInstallment(total, newGroup.totalInstallments)
                        });
                      }}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nº Parcelas</label>
                  <input 
                    required
                    type="number"
                    min="2"
                    max="120"
                    value={newGroup.totalInstallments}
                    onChange={e => {
                      const count = parseInt(e.target.value);
                      setNewGroup({
                        ...newGroup, 
                        totalInstallments: count,
                        installmentAmount: calculateInstallment(newGroup.totalAmount, count)
                      });
                    }}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {newGroup.totalAmount > 0 && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">Valor da Parcela:</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newGroup.installmentAmount)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data 1ª Parcela</label>
                  <input 
                    required
                    type="date"
                    value={newGroup.startDate}
                    onChange={e => setNewGroup({...newGroup, startDate: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Intervalo (Dias)</label>
                  <select 
                    value={newGroup.intervalDays}
                    onChange={e => setNewGroup({...newGroup, intervalDays: parseInt(e.target.value)})}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value={30}>Mensal (30 dias)</option>
                    <option value={15}>Quinzenal (15 dias)</option>
                    <option value={7}>Semanal (7 dias)</option>
                    <option value={31}>31 dias</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta de Saída</label>
                    <select 
                      value={newGroup.accountId}
                      onChange={e => setNewGroup({...newGroup, accountId: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                    <select 
                      value={newGroup.category}
                      onChange={e => setNewGroup({...newGroup, category: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
              </div>
              
              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
              >
                Gerar Parcelas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteGroupConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-rose-500">
                <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Excluir Parcelamento?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center font-medium mb-8">
              Você deseja excluir apenas a regra de parcelamento ou também todos os lançamentos já gerados por ela?
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  onDelete(deleteGroupConfirmId, true);
                  setDeleteGroupConfirmId(null);
                }}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir Tudo (Regra + Lançamentos)
              </button>
              <button 
                onClick={() => {
                  onDelete(deleteGroupConfirmId, false);
                  setDeleteGroupConfirmId(null);
                }}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                Excluir apenas o Contrato
              </button>
              <button 
                onClick={() => setDeleteGroupConfirmId(null)}
                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallmentsView;
