
// Force sync
import React, { useState } from 'react';
import { Category, Account, RecurringTransaction, TransactionType, Transaction, User } from '../types';
import { Plus, Trash2, Tag, Download, Upload, ShieldCheck, CreditCard, Wallet, Banknote, Pencil, X, AlertTriangle, Calendar, Repeat, Users, Copy, LogOut, CheckCircle } from 'lucide-react';
import { getRandomColor } from '../constants';

interface SettingsViewProps {
  categories: Category[];
  accounts: Account[];
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[];
  currentUserProfile?: User | null;
  users?: User[];
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onImportData: (data: string) => void;
  onAddAccount: (acc: Omit<Account, 'id' | 'currentBalance'>) => void;
  onDeleteAccount: (id: string) => void;
  onUpdateAccount: (account: Account) => void;
  onUpdateAccountBalance: (id: string, newBalance: number) => void;
  onAddRecurring: (rec: Omit<RecurringTransaction, 'id' | 'lastGeneratedDate' | 'active'>) => void;
  onDeleteRecurring: (id: string) => void;
  spendingCeiling?: number;
  onUpdateSpendingCeiling?: (amount: number) => void;
  onUpdateProfile?: (updates: { name?: string; spendingCeiling?: number }) => void;
  onLinkUser?: (code: string) => void;
  onUnlinkUser?: (id: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  categories, 
  accounts, 
  recurringTransactions,
  transactions,
  currentUserProfile,
  users,
  onAddCategory, 
  onDeleteCategory, 
  onImportData, 
  onAddAccount, 
  onDeleteAccount, 
  onUpdateAccount,
  onUpdateAccountBalance,
  onAddRecurring,
  onDeleteRecurring,
  spendingCeiling,
  onUpdateSpendingCeiling,
  onUpdateProfile,
  onLinkUser,
  onUnlinkUser
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('EXPENSE');
  const [ceilingAmount, setCeilingAmount] = useState(spendingCeiling?.toString() || '');
  const [joinCode, setJoinCode] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUserProfile?.name || '');
  
  // Estados para nova conta
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<Account['type']>('Corrente');
  const [accBalance, setAccBalance] = useState('');

  // Estados para nova recorrência
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<TransactionType>('EXPENSE');
  const [recCategory, setRecCategory] = useState(categories[0]?.name || '');
  const [recDay, setRecDay] = useState('5');
  const [recAccount, setRecAccount] = useState(accounts[0]?.id || '');
  const [recIsJoint, setRecIsJoint] = useState(true);

  // Estados para Modais
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<Account['type']>('Corrente');
  const [editCurrentBalance, setEditCurrentBalance] = useState('');

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accBalance) return;
    onAddAccount({
      name: accName,
      type: accType,
      initialBalance: parseFloat(accBalance),
      color: getRandomColor()
    });
    setAccName('');
    setAccBalance('');
  };

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recDesc || !recAmount || !recAccount) return;

    onAddRecurring({
        description: recDesc,
        amount: parseFloat(recAmount),
        type: recType,
        category: recCategory,
        dayOfMonth: parseInt(recDay),
        accountId: recAccount,
        userId: 'default', // Should be current user ideally, but simplified for now
        isJoint: recIsJoint
    });
    setRecDesc('');
    setRecAmount('');
  };

  const openDeleteModal = (id: string) => {
    setAccountToDelete(id);
    setDeleteConfirmationText('');
  };

  const confirmDelete = () => {
    if (accountToDelete && deleteConfirmationText === 'APAGAR') {
      onDeleteAccount(accountToDelete);
      setAccountToDelete(null);
    }
  };

  const openEditModal = (account: Account) => {
    setAccountToEdit(account);
    setEditName(account.name);
    setEditType(account.type);
    setEditCurrentBalance(account.currentBalance.toString());
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountToEdit && editName && editCurrentBalance) {
      // Update name and type
      onUpdateAccount({
        ...accountToEdit,
        name: editName,
        type: editType
      });
      // Update balance separately
      onUpdateAccountBalance(accountToEdit.id, parseFloat(editCurrentBalance));
      
      setAccountToEdit(null);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* Gestão de Contas Bancárias */}
      <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-indigo-600" />
          Minhas Contas Bancárias
        </h2>

        <form onSubmit={handleAddAccount} className="flex flex-col md:grid md:grid-cols-4 gap-4 mb-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Nome do Banco/Conta</label>
            <input 
              type="text" 
              placeholder="Ex: Nubank, Itaú, Carteira..." 
              value={accName}
              onChange={e => setAccName(e.target.value)}
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tipo</label>
            <select 
              value={accType}
              onChange={e => setAccType(e.target.value as any)}
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            >
              <option>Corrente</option>
              <option>Poupança</option>
              <option>Investimento</option>
              <option>Dinheiro</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Saldo Inicial (R$)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                value={accBalance}
                onChange={e => setAccBalance(e.target.value)}
                className="flex-1 px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold min-w-0"
              />
              <button type="submit" className="bg-indigo-600 text-white p-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <div key={acc.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between group transition-all hover:bg-white dark:hover:bg-slate-800 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: acc.color }}>
                  <Banknote className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800 dark:text-white truncate text-lg">{acc.name}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400">{acc.type}</p>
                </div>
              </div>
              <div className="text-left sm:text-right flex flex-col sm:items-end shrink-0 ml-16 sm:ml-4">
                <p className="font-black text-indigo-600 text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.currentBalance)}</p>
                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all mt-2 sm:mt-0">
                  <button onClick={() => openEditModal(acc)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => openDeleteModal(acc.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gestão de Usuários */}
      <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Gestão de Usuários
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Convidar Pessoa</h3>
                <p className="text-sm text-slate-500 mb-4">Compartilhe este código para que outra pessoa entre na sua família.</p>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
                    <code className="flex-1 font-mono font-bold text-center text-lg tracking-widest text-indigo-600 truncate">{currentUserProfile?.id}</code>
                    <button onClick={() => {
                        navigator.clipboard.writeText(currentUserProfile?.id || '');
                    }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Copy className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-2">Seu Nome de Exibição</h4>
                    {isEditingName ? (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm"
                            />
                            <button 
                                onClick={() => {
                                    if (onUpdateProfile && newName) {
                                        onUpdateProfile({ name: newName });
                                        setIsEditingName(false);
                                    }
                                }}
                                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setIsEditingName(false)}
                                className="bg-slate-200 dark:bg-slate-700 text-slate-500 p-2 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{currentUserProfile?.name || 'Usuário'}</span>
                            <button 
                                onClick={() => {
                                    setNewName(currentUserProfile?.name || '');
                                    setIsEditingName(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold uppercase"
                            >
                                Editar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Entrar em uma Família</h3>
                <p className="text-sm text-slate-500 mb-4">Digite o código de convite de outra pessoa para se juntar a ela.</p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Código de Convite"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        onClick={() => onLinkUser && onLinkUser(joinCode)}
                        disabled={!joinCode}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </div>

        <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Membros da Família</h3>
            <div className="space-y-3">
                {users?.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: u.avatarColor }}>
                                {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{u.name} {u.id === currentUserProfile?.id && '(Você)'}</p>
                                <p className="text-xs text-slate-400 font-mono">{u.id}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onUnlinkUser && onUnlinkUser(u.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            title="Remover da família"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Categorias Personalizadas */}
      <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
          <Tag className="w-8 h-8 text-indigo-600" />
          Categorias
        </h2>
        
        <form onSubmit={e => {
          e.preventDefault();
          if (newCatName) {
            onAddCategory({ 
                id: Math.random().toString(36).substr(2, 9), 
                name: newCatName, 
                color: getRandomColor(),
                type: 'EXPENSE' // Default to expense, can be changed later or add selector
            });
            setNewCatName('');
          }
        }} className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 flex gap-2">
             <select 
                className="px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                value={newCatType}
                onChange={e => setNewCatType(e.target.value as TransactionType)}
             >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
             </select>
             <input
                type="text"
                placeholder="Nome da categoria..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
             />
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl">
            <Plus className="w-5 h-5 mx-auto" />
          </button>
        </form>

        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-black uppercase text-slate-400 mb-4 ml-2">Despesas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.filter(c => c.type === 'EXPENSE' || !c.type).map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl group transition-all hover:bg-white dark:hover:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-bold">{cat.name}</span>
                    </div>
                    <button onClick={() => onDeleteCategory(cat.id)} className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                ))}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-black uppercase text-slate-400 mb-4 ml-2">Receitas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.filter(c => c.type === 'INCOME').map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl group transition-all hover:bg-white dark:hover:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-bold">{cat.name}</span>
                    </div>
                    <button onClick={() => onDeleteCategory(cat.id)} className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                ))}
                </div>
            </div>
        </div>
      </section>

      {/* Gestão de Recorrências */}
      <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
          <Repeat className="w-8 h-8 text-indigo-600" />
          Contas Recorrentes (Fixas)
        </h2>
        <p className="text-sm text-slate-500 mb-8">Cadastre suas contas fixas para que sejam lançadas automaticamente todo mês.</p>

        <form onSubmit={handleAddRecurring} className="flex flex-col gap-4 mb-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Descrição</label>
                    <input 
                        type="text" 
                        placeholder="Ex: Aluguel, Netflix..." 
                        value={recDesc}
                        onChange={e => setRecDesc(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Valor (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        value={recAmount}
                        onChange={e => setRecAmount(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Dia do Mês</label>
                    <select 
                        value={recDay}
                        onChange={e => setRecDay(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    >
                        {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Categoria</label>
                    <select 
                        value={recCategory}
                        onChange={e => setRecCategory(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    >
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tipo</label>
                    <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1">
                        <button type="button" onClick={() => setRecType('INCOME')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${recType === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>Receita</button>
                        <button type="button" onClick={() => setRecType('EXPENSE')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${recType === 'EXPENSE' ? 'bg-rose-100 text-rose-700' : 'text-slate-400'}`}>Despesa</button>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Conta</label>
                    <select 
                        value={recAccount}
                        onChange={e => setRecAccount(e.target.value)}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    >
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={recIsJoint} onChange={e => setRecIsJoint(e.target.checked)} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">Conjunto?</span>
                    </label>
                </div>
                <div>
                     <button type="submit" className="w-full bg-indigo-600 text-white p-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none font-bold mt-auto h-full flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" /> Adicionar
                    </button>
                </div>
            </div>
        </form>

        <div className="space-y-3">
            {recurringTransactions.length === 0 && <p className="text-center text-slate-400 py-4">Nenhuma recorrência cadastrada.</p>}
            {recurringTransactions.map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${rec.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">{rec.description}</p>
                            <p className="text-xs text-slate-400">Todo dia {rec.dayOfMonth} • {rec.category} • {rec.isJoint ? 'Conjunto' : 'Individual'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`font-black ${rec.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.amount)}
                        </span>
                        <button onClick={() => onDeleteRecurring(rec.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Teto de Gastos */}
      <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          Teto de Gastos Mensal
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Limite Mensal (R$)</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00" 
              value={ceilingAmount}
              onChange={e => setCeilingAmount(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-lg"
            />
          </div>
          <button 
            onClick={() => {
                const amount = parseFloat(ceilingAmount);
                if (!isNaN(amount) && onUpdateSpendingCeiling) {
                    onUpdateSpendingCeiling(amount);
                }
            }}
            className="w-full md:w-auto px-10 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-100 dark:shadow-none"
          >
            Salvar Limite
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          Defina um valor máximo para seus gastos mensais. O painel principal mostrará uma barra de progresso que muda de cor conforme você se aproxima do limite (Azul &lt; 80%, Amarelo &lt; 95%, Vermelho &gt; 95%).
        </p>
      </section>

      {/* Backup e Dados */}
      <section className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-indigo-600" />
          Backup e Dados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                    <Download className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Exportar Dados</h3>
                <p className="text-sm text-slate-500 mb-6">Baixe uma cópia completa de suas transações, contas e categorias em formato JSON.</p>
                <button 
                    onClick={() => {
                        const data = JSON.stringify({ categories, accounts, recurringTransactions, transactions }, null, 2);
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `backup-financeiro-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }}
                    className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                >
                    Baixar Backup
                </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Importar Backup</h3>
                <p className="text-sm text-slate-500 mb-6">Restaure seus dados a partir de um arquivo de backup (.json) gerado anteriormente.</p>
                <label className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all text-center cursor-pointer block">
                    Selecionar Arquivo
                    <input 
                        type="file" 
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    if (event.target?.result) {
                                        onImportData(event.target.result as string);
                                    }
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />
                </label>
            </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4 text-rose-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Excluir Conta?</h3>
              <p className="text-sm text-slate-500 mt-2">
                Para confirmar a exclusão, digite <strong>APAGAR</strong> abaixo. Essa ação não pode ser desfeita.
              </p>
            </div>
            
            <input 
              type="text" 
              placeholder="Digite APAGAR"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 text-center font-bold uppercase mb-6"
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value.toUpperCase())}
            />
            
            <div className="flex gap-3">
              <button onClick={() => setAccountToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
              <button 
                onClick={confirmDelete} 
                disabled={deleteConfirmationText !== 'APAGAR'}
                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {accountToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Conta</h3>
              <button onClick={() => setAccountToEdit(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome da Conta</label>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Tipo</label>
                <select 
                  value={editType}
                  onChange={e => setEditType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold"
                >
                  <option>Corrente</option>
                  <option>Poupança</option>
                  <option>Investimento</option>
                  <option>Dinheiro</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Saldo Atual (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold" 
                  value={editCurrentBalance} 
                  onChange={e => setEditCurrentBalance(e.target.value)} 
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">O sistema ajustará o saldo inicial para atingir este valor.</p>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setAccountToEdit(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
