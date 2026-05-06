
import React, { useState, useMemo } from 'react';
import { InstallmentGroup, Transaction, Account, Category } from '../types';
import { format, parseISO, addMonths } from 'date-fns';
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
  CalendarCheck
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
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  const [deleteGroupConfirmId, setDeleteGroupConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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

  const monthlyInstallments = useMemo(() => {
    const list: any[] = [];
    
    installmentGroups.forEach(group => {
      // Find which installments of this group fall into the target month
      const baseDate = parseISO(group.startDate);
      
      for (let i = 0; i < group.totalInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(baseDate.getDate() + (i * group.intervalDays));
        
        if (dueDate.getMonth() === targetDate.getMonth() && dueDate.getFullYear() === targetDate.getFullYear()) {
          // Check if already paid (exists as a transaction)
          const paidRecord = transactions.find(t => 
            t.installmentGroupId === group.id && 
            t.installmentNumber === (i + 1)
          );
          
          list.push({
            ...group,
            installmentNumber: i + 1,
            dueDate,
            status: paidRecord ? 'paid' : (dueDate < new Date() ? 'late' : 'pending'),
            paidTransactionId: paidRecord?.id
          });
        }
      }
    });
    
    return list;
  }, [installmentGroups, transactions, targetDate]);

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

  const handleConfirm = async (item: any) => {
    if (item.status === 'paid') return;
    
    // In this system, transactions are generated upfront, so "validating" 
    // an installment might mean marking it as paid or just confirming the details.
    // However, the user said they are generated automatically.
    // If they already exist, we don't need to 'onValidate' (create new).
    // Let's assume 'validating' here means the user confirms it happened.
    // But since they are already in the 'transactions' list, they already affect the balance.
    // Wait, the user might want to edit the amount or date before it's "final".
    
    // For now, let's keep it simple: they are already there.
    alert('Esta parcela já está registrada no seu extrato.');
  };

  const calculateInstallment = (total: number, count: number) => {
    if (count <= 0) return 0;
    return Math.round((total / count) * 100) / 100;
  };

  const totalMonthly = monthlyInstallments.reduce((sum, item) => sum + item.installmentAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <FilterBar 
        categories={categories}
        accounts={accounts}
        onFilterChange={setCurrentFilters}
        showPrint={false}
      />

      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Comprometido (Mês)</p>
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
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Parcelas do Mês</p>
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

      {/* List matches Recorrentes style */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-indigo-500" />
              Contas Parceladas
            </h2>
            <p className="text-slate-400 text-sm mt-1">Lançamentos parcelados com data de fim.</p>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Vencimento</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Parcela</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlyInstallments.map((item, idx) => (
                <tr key={idx} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.status === 'paid' ? 'opacity-50' : ''}`}>
                  <td className="p-4">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                      item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'late' ? 'bg-rose-100 text-rose-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status === 'paid' ? 'Pago' : item.status === 'late' ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                    {format(item.dueDate, 'dd/MM/yyyy')}
                  </td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    {item.description}
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
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Nenhuma parcela para este mês.
                  </td>
                </tr>
              )}
            </tbody>
            {monthlyInstallments.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-black">
                <tr>
                  <td colSpan={4} className="p-4 text-right text-slate-500 uppercase text-[10px]">Total do Mês:</td>
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
