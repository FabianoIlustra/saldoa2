
// Force sync
import React, { useState, useEffect } from 'react';
import { Category, Account, RecurringTransaction, TransactionType, Transaction, User } from '../types';
import { Plus, Trash2, Tag, Download, Upload, ShieldCheck, CreditCard, Wallet, Banknote, Pencil, X, AlertTriangle, Calendar, Repeat, Users, Copy, LogOut, CheckCircle, Brain, Heart, Moon, Sun, Target, ChevronDown, Lock, Sparkles } from 'lucide-react';
import { getRandomColor } from '../constants';

interface SettingsViewProps {
  categories: Category[];
  accounts: Account[];
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[];
  currentUserProfile?: User | null;
  users?: User[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onImportData: (data: string) => void;
  onAddAccount: (acc: Omit<Account, 'id' | 'currentBalance'>) => void;
  onDeleteAccount: (id: string) => void;
  onUpdateAccount: (account: Account) => void;
  onUpdateAccountBalance: (id: string, newBalance: number) => void;
  onAddRecurring: (rec: Omit<RecurringTransaction, 'id' | 'lastGeneratedDate' | 'active'>) => void;
  onUpdateRecurring: (rec: RecurringTransaction) => void;
  onDeleteRecurring: (id: string) => void;
  spendingCeiling?: number;
  onUpdateSpendingCeiling?: (amount: number) => void;
  onUpdateProfile?: (updates: { name?: string; spendingCeiling?: number }) => void;
  onLinkUser?: (code: string) => void;
  onUnlinkUser?: (id: string) => void;
  isCoupleMode?: boolean;
  onToggleCoupleMode?: (val: boolean) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  importRules?: Record<string, string>;
  onDeleteImportRule?: (pattern: string) => void;
  onClearImportRules?: () => void;
  initialOpenSection?: string;
}

const CollapsibleSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-indigo-600">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
          </div>
          <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
            {title}
          </h2>
        </div>
        <div className={`p-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <Plus className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        </div>
      </button>
      
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="border-t border-slate-50 dark:border-slate-800 pt-4">
          {children}
        </div>
      </div>
    </section>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({ 
  categories, 
  accounts, 
  recurringTransactions,
  transactions,
  currentUserProfile,
  users,
  onAddCategory, 
  onUpdateCategory,
  onDeleteCategory, 
  onImportData, 
  onAddAccount, 
  onDeleteAccount, 
  onUpdateAccount,
  onUpdateAccountBalance,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  spendingCeiling,
  onUpdateSpendingCeiling,
  onUpdateProfile,
  onLinkUser,
  onUnlinkUser,
  isCoupleMode,
  onToggleCoupleMode,
  theme,
  onToggleTheme,
  importRules = {},
  onDeleteImportRule,
  onClearImportRules,
  initialOpenSection
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
  const [recToAccount, setRecToAccount] = useState('');
  const [recIsJoint, setRecIsJoint] = useState(true);
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados para Modais
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<Account['type']>('Corrente');
  const [editCurrentBalance, setEditCurrentBalance] = useState('');

  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');
  const [editCatType, setEditCatType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editCatLimit, setEditCatLimit] = useState('');
  const [editCatMonitored, setEditCatMonitored] = useState(false);
  const [editCatIsEssential, setEditCatIsEssential] = useState(false);

  const [recurringToEdit, setRecurringToEdit] = useState<RecurringTransaction | null>(null);
  const [editRecDesc, setEditRecDesc] = useState('');
  const [editRecAmount, setEditRecAmount] = useState('');
  const [editRecType, setEditRecType] = useState<TransactionType>('EXPENSE');
  const [editRecCategory, setEditRecCategory] = useState('');
  const [editRecDay, setEditRecDay] = useState('');
  const [editRecAccount, setEditRecAccount] = useState('');
  const [editRecToAccount, setEditRecToAccount] = useState('');
  const [editRecIsJoint, setEditRecIsJoint] = useState(true);
  const [editRecStartDate, setEditRecStartDate] = useState('');

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
    if (recType === 'TRANSFER' && !recToAccount) return;

    onAddRecurring({
        description: recDesc,
        amount: parseFloat(recAmount),
        type: recType,
        category: recType === 'TRANSFER' ? 'Transferência' : recCategory,
        dayOfMonth: parseInt(recDay),
        accountId: recAccount,
        toAccountId: recType === 'TRANSFER' ? recToAccount : undefined,
        userId: 'default', // Should be current user ideally, but simplified for now
        isJoint: recIsJoint,
        startDate: recStartDate
    });
    setRecDesc('');
    setRecAmount('');
    setRecToAccount('');
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

  const openEditCategoryModal = (cat: Category) => {
    setCategoryToEdit(cat);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
    setEditCatType(cat.type || 'EXPENSE');
    setEditCatLimit(cat.limit?.toString() || '');
    setEditCatMonitored(!!cat.monitored);
    setEditCatIsEssential(!!cat.isEssential);
  };

  const openEditRecurringModal = (rec: RecurringTransaction) => {
    setRecurringToEdit(rec);
    setEditRecDesc(rec.description);
    setEditRecAmount(rec.amount.toString());
    setEditRecType(rec.type);
    setEditRecCategory(rec.category);
    setEditRecDay(rec.dayOfMonth.toString());
    setEditRecAccount(rec.accountId);
    setEditRecToAccount(rec.toAccountId || '');
    setEditRecIsJoint(rec.isJoint);
    setEditRecStartDate(rec.startDate || new Date().toISOString().split('T')[0]);
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

  const saveEditCategory = (e: React.FormEvent) => {
     e.preventDefault();
     if (categoryToEdit && editCatName) {
       onUpdateCategory({
         ...categoryToEdit,
         name: editCatName,
         color: editCatColor,
         type: editCatType,
         limit: editCatLimit ? parseFloat(editCatLimit) : undefined,
         monitored: editCatMonitored,
         isEssential: editCatIsEssential
       });
       setCategoryToEdit(null);
     }
   };

  const saveEditRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (recurringToEdit && editRecDesc && editRecAmount && editRecAccount) {
      if (editRecType === 'TRANSFER' && !editRecToAccount) return;

      onUpdateRecurring({
        ...recurringToEdit,
        description: editRecDesc,
        amount: parseFloat(editRecAmount),
        type: editRecType,
        category: editRecType === 'TRANSFER' ? 'Transferência' : editRecCategory,
        dayOfMonth: parseInt(editRecDay),
        accountId: editRecAccount,
        toAccountId: editRecType === 'TRANSFER' ? editRecToAccount : undefined,
        isJoint: editRecIsJoint,
        startDate: editRecStartDate
      });
      setRecurringToEdit(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Gestão de Contas Bancárias */}
      <CollapsibleSection 
        title="Minhas Contas Bancárias" 
        icon={<CreditCard className="w-5 h-5" />}
        defaultOpen={true}
      >
        <form onSubmit={handleAddAccount} className="flex flex-col md:grid md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="md:col-span-2">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Nome do Banco/Conta</label>
            <input 
              type="text" 
              placeholder="Ex: Nubank, Itaú, Carteira..." 
              value={accName}
              onChange={e => setAccName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tipo</label>
            <select 
              value={accType}
              onChange={e => setAccType(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-xs"
            >
              <option>Corrente</option>
              <option>Poupança</option>
              <option>Investimento</option>
              <option>Dinheiro</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Saldo Inicial (R$)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                value={accBalance}
                onChange={e => setAccBalance(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-xs min-w-0"
              />
              <button type="submit" className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm shrink-0 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          {accounts.map(acc => (
            <div key={acc.id} className="p-3 flex items-center justify-between group transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: acc.color }}>
                  <Banknote className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-white truncate text-xs">{acc.name}</p>
                  <span className="text-[9px] font-black uppercase text-slate-400">{acc.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <p className="font-black text-indigo-600 text-xs">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.currentBalance)}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(acc)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openDeleteModal(acc.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="p-4 text-center text-slate-400 text-xs">
              Nenhuma conta cadastrada.
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Gestão de Usuários */}
      <CollapsibleSection 
        title="Gestão de Usuários e Preferências" 
        icon={<Users className="w-5 h-5" />}
        defaultOpen={initialOpenSection === 'gestao'}
      >
        {/* Preferências de Visualização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <button 
                onClick={() => {
                  const isBlocked = !currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico';
                  if (isBlocked) {
                    const modalBtn = document.getElementById('trigger-subscription-modal');
                    if (modalBtn) modalBtn.click();
                    return;
                  }
                  onToggleCoupleMode?.(!isCoupleMode);
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden ${
                    isCoupleMode 
                    ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30 text-rose-600' 
                    : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 text-slate-500'
                }`}
            >
                {(!currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico') && (
                  <div className="absolute right-2 top-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-2 h-2" /> Premium / Médio
                  </div>
                )}
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCoupleMode ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                        <Heart className={`w-4 h-4 ${isCoupleMode ? 'fill-current' : ''}`} />
                    </div>
                    <div className="text-left">
                        <p className="font-black text-xs uppercase tracking-wider">Modo Família</p>
                        <p className="text-[10px] opacity-75">{isCoupleMode ? 'Visualizando todos os lançamentos' : 'Visualizando apenas seus lançamentos'}</p>
                    </div>
                </div>
                <div className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${isCoupleMode ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isCoupleMode ? 'left-4.5' : 'left-0.5'}`} />
                </div>
            </button>

            <button 
                onClick={onToggleTheme}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                        <p className="font-black text-xs uppercase tracking-wider">Tema do Sistema</p>
                        <p className="text-[10px] opacity-75">Alternar entre claro e escuro</p>
                    </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">{theme === 'light' ? 'Claro' : 'Escuro'}</span>
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Convidar Pessoa */}
            <div className={`bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative ${(!currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico') ? 'min-h-[180px]' : ''}`}>
                {(!currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico') && (
                  <div 
                    onClick={() => document.getElementById('trigger-subscription-modal')?.click()}
                    className="absolute inset-0 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1.5px] rounded-xl z-10 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-950/20 transition-all"
                  >
                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white">Conexão de Família Bloqueada</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Disponível nos planos Médio e Premium</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1.5 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Ver Planos</span>
                  </div>
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Convidar Pessoa</h3>
                <p className="text-xs text-slate-500 mb-3">Compartilhe este código para que outra pessoa entre na sua família.</p>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-3">
                    <code className="flex-1 font-mono font-bold text-center text-sm tracking-wider text-indigo-600 truncate">{currentUserProfile?.id}</code>
                    <button onClick={() => {
                        navigator.clipboard.writeText(currentUserProfile?.id || '');
                    }} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Seu Nome de Exibição</h4>
                    {isEditingName ? (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                            <button 
                                onClick={() => {
                                    if (onUpdateProfile && newName) {
                                        onUpdateProfile({ name: newName });
                                        setIsEditingName(false);
                                    }
                                }}
                                className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setIsEditingName(false)}
                                className="bg-slate-200 dark:bg-slate-700 text-slate-500 p-1.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{currentUserProfile?.name || 'Usuário'}</span>
                            <button 
                                onClick={() => {
                                    setNewName(currentUserProfile?.name || '');
                                    setIsEditingName(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase"
                            >
                                Editar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Entrar em uma Família */}
            <div className={`bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative ${(!currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico') ? 'min-h-[180px]' : ''}`}>
                {(!currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico') && (
                  <div 
                    onClick={() => document.getElementById('trigger-subscription-modal')?.click()}
                    className="absolute inset-0 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1.5px] rounded-xl z-10 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-950/20 transition-all"
                  >
                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white">Conexão de Família Bloqueada</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Disponível nos planos Médio e Premium</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1.5 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Ver Planos</span>
                  </div>
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Entrar em uma Família</h3>
                <p className="text-xs text-slate-500 mb-3">Digite o código de convite de outra pessoa para se juntar a ela.</p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Código de Convite"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                    <button 
                        onClick={() => onLinkUser && onLinkUser(joinCode)}
                        disabled={!joinCode}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-xs"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </div>

        <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2.5">Membros da Família</h3>
            <div className="space-y-2">
                {users?.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: u.avatarColor }}>
                                {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-xs text-slate-900 dark:text-white">{u.name} {u.id === currentUserProfile?.id && '(Você)'}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{u.id}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onUnlinkUser && onUnlinkUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remover da família"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </CollapsibleSection>

      {/* Plano & Assinatura */}
      <CollapsibleSection 
        title="Plano & Assinatura" 
        icon={<Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        defaultOpen={true}
      >
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Seu Plano Financeiro</div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              Plano Ativo: <span className="text-indigo-600 dark:text-indigo-400 uppercase font-black">{currentUserProfile?.tier || 'gratis'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              {currentUserProfile?.tier === 'premium' ? 'Parabéns! Você tem acesso completo e ilimitado a todas as ferramentas, automações recorrentes, modo família e comando de voz.' : 
               currentUserProfile?.tier === 'medio' ? 'Excelente! Seu plano Médio libera automações recorrentes, controle inteligente por voz e sincronização em tempo real de casal.' :
               currentUserProfile?.tier === 'basico' ? 'Seu plano Básico libera controle por voz para lançar transações rapidamente com áudio.' :
               'Você está utilizando o plano Grátis. Faça um upgrade para liberar lançamentos por voz, metas personalizadas extras, cadastro de contas recorrentes e conexão de casal!'}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => {
              const modalBtn = document.getElementById('trigger-subscription-modal');
              if (modalBtn) modalBtn.click();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-widest uppercase rounded-lg shadow-sm transition-all shrink-0 self-start md:self-auto"
          >
            Alterar Assinatura
          </button>
        </div>
      </CollapsibleSection>

      {/* Categorias Personalizadas */}
      <CollapsibleSection 
        title="Categorias e Metas" 
        icon={<Tag className="w-5 h-5" />}
      >
        <form onSubmit={e => {
          e.preventDefault();
          if (newCatName) {
            onAddCategory({ 
                id: Math.random().toString(36).substr(2, 9), 
                name: newCatName, 
                color: getRandomColor(),
                type: newCatType
            });
            setNewCatName('');
          }
        }} className="flex flex-col md:flex-row gap-2 mb-6">
          <div className="flex-1 flex gap-2">
             <select 
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
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
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
             />
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-wider hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center">
            <Plus className="w-4 h-4 mr-1" /> Adicionar Categoria
          </button>
        </form>

        <div className="space-y-4">
            <div>
                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Despesas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {categories.filter(c => c.type === 'EXPENSE' || !c.type).map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg group transition-all hover:bg-white dark:hover:bg-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="text-xs font-bold truncate text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="truncate">{cat.name}</span>
                          {cat.limit && cat.limit > 0 ? (
                            <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 shrink-0 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-md border border-rose-100/50 dark:border-rose-900/30">
                              Lmt: R$ {cat.limit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => openEditCategoryModal(cat)} className="text-slate-400 hover:text-indigo-500 p-1">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteCategory(cat.id)} className="text-slate-400 hover:text-rose-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                ))}
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Receitas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {categories.filter(c => c.type === 'INCOME').map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg group transition-all hover:bg-white dark:hover:bg-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="text-xs font-bold truncate text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="truncate">{cat.name}</span>
                          {cat.limit && cat.limit > 0 ? (
                            <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md border border-emerald-100/50 dark:border-emerald-900/30">
                              Lmt: R$ {cat.limit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => openEditCategoryModal(cat)} className="text-slate-400 hover:text-indigo-500 p-1">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteCategory(cat.id)} className="text-slate-400 hover:text-rose-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
      </CollapsibleSection>

      {/* Teto de Gastos */}
      <CollapsibleSection 
        title="Teto de Gastos Mensal" 
        icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
      >
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Limite Mensal (R$)</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00" 
              value={ceilingAmount}
              onChange={e => setCeilingAmount(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-xs"
            />
          </div>
          <button 
            onClick={() => {
                const amount = parseFloat(ceilingAmount);
                if (!isNaN(amount) && onUpdateSpendingCeiling) {
                    onUpdateSpendingCeiling(amount);
                }
            }}
            className="w-full md:w-auto px-4 py-2 bg-amber-500 text-white rounded-lg font-black uppercase text-[10px] tracking-wider hover:bg-amber-600 transition-all shadow-sm"
          >
            Salvar Limite
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Defina um valor máximo para seus gastos mensais. O painel principal mostrará uma barra de progresso que muda de cor conforme você se aproxima do limite (Azul &lt; 80%, Amarelo &lt; 95%, Vermelho &gt; 95%).
        </p>
      </CollapsibleSection>

      {/* Inteligência de Importação */}
      <CollapsibleSection 
        title="Inteligência de Importação" 
        icon={<Brain className="w-5 h-5" />}
      >
        <div className="flex justify-end mb-2.5">
          {Object.keys(importRules).length > 0 && (
            <button 
              onClick={() => {
                if (confirm('Tem certeza que deseja apagar todas as regras de aprendizado?')) {
                    onClearImportRules?.();
                }
              }}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-all"
            >
              Limpar Tudo
            </button>
          )}
        </div>
        
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">Padrões que o sistema aprendeu para categorizar seus extratos automaticamente. Você pode excluir padrões incorretos aqui.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Object.entries(importRules).length === 0 && (
            <div className="col-span-full py-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-medium">Nenhuma regra aprendida ainda.<br/>Importe um extrato para começar a ensinar o sistema!</p>
            </div>
          )}
          {Object.entries(importRules).map(([pattern, category]) => (
            <div key={pattern} className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-all hover:bg-white dark:hover:bg-slate-800 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Padrão</p>
                <p className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate">{pattern}</p>
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{category}</span>
                </div>
              </div>
              <button 
                onClick={() => onDeleteImportRule?.(pattern)}
                className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Backup e Dados */}
      <CollapsibleSection 
        title="Backup e Dados" 
        icon={<ShieldCheck className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center mb-2">
                      <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Exportar Dados</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Baixe uma cópia completa de suas transações, contas e categorias em formato JSON.</p>
                </div>
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
                    className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                >
                    Baixar Backup
                </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center mb-2">
                      <Upload className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Importar Backup</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Restaure seus dados a partir de um arquivo de backup (.json) gerado anteriormente.</p>
                </div>
                <label className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all text-center cursor-pointer block shadow-sm">
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
      </CollapsibleSection>

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-3 text-rose-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Excluir Conta?</h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Para confirmar a exclusão, digite <strong>APAGAR</strong> abaixo. Essa ação não pode ser desfeita.
              </p>
            </div>
            
            <input 
              type="text" 
              placeholder="Digite APAGAR"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500 text-center font-bold uppercase mb-4 text-xs"
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value.toUpperCase())}
            />
            
            <div className="flex gap-2">
              <button onClick={() => setAccountToDelete(null)} className="flex-1 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs">Cancelar</button>
              <button 
                onClick={confirmDelete} 
                disabled={deleteConfirmationText !== 'APAGAR'}
                className="flex-1 bg-rose-500 text-white py-2 rounded-lg font-bold hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-xs"
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
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Editar Conta</h3>
              <button onClick={() => setAccountToEdit(null)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Nome da Conta</label>
                <input 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-xs" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Tipo</label>
                <select 
                  value={editType}
                  onChange={e => setEditType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-xs"
                >
                  <option>Corrente</option>
                  <option>Poupança</option>
                  <option>Investimento</option>
                  <option>Dinheiro</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Saldo Atual (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-xs" 
                  value={editCurrentBalance} 
                  onChange={e => setEditCurrentBalance(e.target.value)} 
                />
                <p className="text-[9px] text-slate-400 mt-1 ml-0.5">O sistema ajustará o saldo inicial para atingir este valor.</p>
              </div>
              
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setAccountToEdit(null)} className="flex-1 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {categoryToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Editar Categoria</h3>
              <button onClick={() => setCategoryToEdit(null)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={saveEditCategory} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Nome da Categoria</label>
                <input 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-xs" 
                  value={editCatName} 
                  onChange={e => setEditCatName(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Cor</label>
                <div className="flex gap-2 items-center">
                    <input 
                        type="color" 
                        value={editCatColor}
                        onChange={e => setEditCatColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
                    />
                    <span className="text-[10px] font-mono text-slate-500">{editCatColor}</span>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Tipo de Categoria</label>
                <select 
                  value={editCatType}
                  onChange={e => setEditCatType(e.target.value as 'INCOME' | 'EXPENSE')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-xs"
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-md">
                            <Target className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monitorar Limite?</p>
                            <p className="text-[9px] text-slate-500">Exibir progresso na aba Gráficos</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setEditCatMonitored(!editCatMonitored)}
                        className={`w-8 h-4.5 rounded-full relative transition-colors ${editCatMonitored ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${editCatMonitored ? 'left-4' : 'left-0.5'}`} />
                    </button>
                </div>

                {editCatMonitored && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5 mb-1 block">Limite Mensal (R$)</label>
                        <input 
                            type="number"
                            step="0.01"
                            placeholder="Ex: 500.00"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-xs" 
                            value={editCatLimit} 
                            onChange={e => setEditCatLimit(e.target.value)} 
                        />
                    </div>
                )}

                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-md">
                            <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gasto Essencial?</p>
                            <p className="text-[9px] text-slate-500">Ex: Aluguel, Luz, Comida</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setEditCatIsEssential(!editCatIsEssential)}
                        className={`w-8 h-4.5 rounded-full relative transition-colors ${editCatIsEssential ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${editCatIsEssential ? 'left-4' : 'left-0.5'}`} />
                    </button>
                </div>
              </div>
              
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setCategoryToEdit(null)} className="flex-1 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default SettingsView;
