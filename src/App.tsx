import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Wallet, LayoutDashboard, History, Settings, Users, FileText, Filter, XCircle, Target, MessageSquareCode, CheckCircle, Info, Heart, Moon, Sun, Clapperboard, CreditCard, Camera, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import AIConsultant from './components/AIConsultant';
import Visuals from './components/Visuals';
import SettingsView from './components/SettingsView';
import GoalsTrack from './components/GoalsTrack';
import StatementImporter from './components/StatementImporter';
import ReceiptScanner from './components/ReceiptScanner';
import LandingPage from './components/LandingPage';
import Auth from './Auth';
import { Transaction, User, Account, Category, Goal, RecurringTransaction } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { format, isSameMonth, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval } from 'date-fns';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useAuth } from './contexts/AuthContext';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

type TabType = 'dashboard' | 'transactions' | 'goals' | 'ai' | 'settings' | 'scanner' | 'visuals';

const App: React.FC = () => {
  const { user, signOut } = useAuth();
  const {
    transactions,
    accounts,
    categories,
    recurringTransactions,
    goals,
    loading: dataLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    addGoal,
    updateGoal,
    deleteGoal
  } = useSupabaseData();

  const [hasStarted, setHasStarted] = useState(() => localStorage.getItem('finan_ai_started') === 'true');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('finan_ai_theme') as 'light' | 'dark') || 'light');
  const [isCoupleMode, setIsCoupleMode] = useState<boolean>(() => localStorage.getItem('finan_ai_couple_mode') === 'true');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [shouldAutoStartVoice, setShouldAutoStartVoice] = useState(false);

  // Mock users for UI compatibility (since we are now using Supabase Auth)
  const users: User[] = user ? [{ id: user.id, name: user.user_metadata.name || user.email || 'Usuário', avatar: user.user_metadata.avatar_url, color: AVATAR_COLORS[0] }] : [];
  const currentUser = users[0] || null;

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('finan_ai_started', String(hasStarted));
    localStorage.setItem('finan_ai_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('finan_ai_couple_mode', String(isCoupleMode));
  }, [hasStarted, theme, isCoupleMode]);

  // Check for recurring transactions on load
  useEffect(() => {
    if (dataLoading || recurringTransactions.length === 0) return;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthYear = `${today.getMonth() + 1}/${today.getFullYear()}`;
    const todayString = today.toISOString().split('T')[0];

    let hasUpdates = false;

    recurringTransactions.forEach(rec => {
        if (!rec.active) return;

        // Check if already generated for this month
        let lastGenDate: Date | null = null;
        let lastGenMonthYear = '';
        let lastGenDayString = '';

        if (rec.lastGeneratedDate) {
            lastGenDate = new Date(rec.lastGeneratedDate);
            if (!isNaN(lastGenDate.getTime())) {
                lastGenMonthYear = `${lastGenDate.getMonth() + 1}/${lastGenDate.getFullYear()}`;
                lastGenDayString = lastGenDate.toISOString().split('T')[0];
            }
        }

        // Safety check: if generated today, don't generate again to prevent loops
        if (lastGenDayString === todayString) return;

        if (lastGenMonthYear !== currentMonthYear && currentDay >= rec.dayOfMonth) {
            // Generate transaction
            const newTrans: Omit<Transaction, 'id' | 'user_id'> = {
                description: rec.description,
                amount: rec.amount,
                type: rec.type,
                category: rec.category,
                date: today.toISOString(),
                accountId: rec.accountId,
                userId: currentUser?.id || '', // Use current user ID
                isJoint: rec.isJoint
            };

            addTransaction(newTrans);
            
            // Update recurring transaction last generated date
            updateRecurringTransaction({
                ...rec,
                lastGeneratedDate: today.toISOString()
            });
            
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        showToast('Lançamentos recorrentes gerados!', 'info');
    }
  }, [recurringTransactions, dataLoading, currentUser, addTransaction, updateRecurringTransaction]);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'user_id'>) => {
    addTransaction(newTransaction);
    showToast('Lançamento adicionado com sucesso!');
    setIsFormOpen(false);
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    updateTransaction(updatedTransaction);
    showToast('Lançamento atualizado com sucesso!');
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
    showToast('Lançamento removido com sucesso!');
  };

  const handleAddAccount = (newAccount: Omit<Account, 'id'>) => {
    // Adapter for Omit<Account, 'id'> to Omit<Account, 'id' | 'user_id'>
    // Actually addAccount expects Omit<Account, 'id' | 'user_id'>
    // We need to ensure newAccount doesn't have user_id or we handle it
    const { ...accData } = newAccount as any;
    delete accData.id;
    addAccount(accData);
    showToast('Conta criada com sucesso!');
  };

  const handleUpdateAccount = (updatedAccount: Account) => {
    updateAccount(updatedAccount);
    showToast('Conta atualizada com sucesso!');
  };

  const handleDeleteAccount = (id: string) => {
    deleteAccount(id);
    showToast('Conta removida com sucesso!');
  };

  const handleUpdateAccountBalance = (id: string, newBalance: number) => {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    // Calculate the difference needed to reach the new balance
    // Current Balance = Initial Balance + Transactions
    // New Initial Balance = New Balance - Transactions
    
    const accountTransactions = transactions.filter(t => t.accountId === id);
    const transactionsBalance = accountTransactions.reduce((acc, t) => {
        return acc + (t.type === 'INCOME' ? t.amount : -t.amount);
    }, 0);

    const newInitialBalance = newBalance - transactionsBalance;

    updateAccount({
        ...account,
        initialBalance: newInitialBalance
    });
    showToast('Saldo atualizado com sucesso!');
  };

  const handleAddCategory = (name: string, type: 'INCOME' | 'EXPENSE', budget?: number) => {
    addCategory({ name, type, budget });
    showToast('Categoria adicionada!');
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory(id);
    showToast('Categoria removida!');
  };

  const handleAddGoal = (goal: Omit<Goal, 'id'>) => {
    const { ...goalData } = goal as any;
    delete goalData.id;
    addGoal(goalData);
    showToast('Meta criada com sucesso!');
  };

  const handleUpdateGoal = (goal: Goal) => {
    updateGoal(goal);
    showToast('Meta atualizada com sucesso!');
  };

  const handleDeleteGoal = (id: string) => {
    deleteGoal(id);
    showToast('Meta removida com sucesso!');
  };

  const handleAddRecurring = (recurring: Omit<RecurringTransaction, 'id'>) => {
    const { ...recData } = recurring as any;
    delete recData.id;
    addRecurringTransaction(recData);
    showToast('Recorrência criada com sucesso!');
  };

  const handleDeleteRecurring = (id: string) => {
    deleteRecurringTransaction(id);
    showToast('Recorrência removida!');
  };

  const filteredTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  if (!user) {
    return <Auth />;
  }

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-slate-900 p-4 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center safe-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Saldo A2</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financeiro</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={signOut} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Saldo A2</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financeiro</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
              { id: 'transactions', icon: History, label: 'Lançamentos' },
              { id: 'visuals', icon: Target, label: 'Gráficos' },
              { id: 'goals', icon: Target, label: 'Metas' },
              { id: 'ai', icon: MessageSquareCode, label: 'Consultor IA' },
              { id: 'settings', icon: Settings, label: 'Ajustes' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <item.icon size={20} strokeWidth={2.5} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {currentUser?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button onClick={signOut} className="text-slate-400 hover:text-rose-500">
                  <LogOut size={18} />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 pb-24 lg:pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
          
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={filteredTransactions}
              accounts={accounts}
              goals={goals}
              onAddTransaction={() => setIsFormOpen(true)}
              onAddGoal={() => setActiveTab('goals')}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionList
              transactions={filteredTransactions}
              accounts={accounts}
              categories={categories}
              users={users}
              onDelete={handleDeleteTransaction}
              onEdit={handleUpdateTransaction}
            />
          )}

          {activeTab === 'visuals' && (
            <Visuals
              transactions={filteredTransactions}
              categories={categories}
              users={users}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsTrack
              goals={goals}
              transactions={filteredTransactions}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'ai' && (
            <AIConsultant
              transactions={filteredTransactions}
              accounts={accounts}
              goals={goals}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              categories={categories}
              accounts={accounts}
              users={users}
              recurringTransactions={recurringTransactions}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onUpdateAccountBalance={handleUpdateAccountBalance}
              onAddUser={() => {}} // Disabled in Supabase mode for now
              onDeleteUser={() => {}} // Disabled in Supabase mode for now
              onToggleCoupleMode={() => setIsCoupleMode(!isCoupleMode)}
              isCoupleMode={isCoupleMode}
              onAddRecurring={handleAddRecurring}
              onDeleteRecurring={handleDeleteRecurring}
            />
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-40">
        <div className="flex justify-around items-center p-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
            { id: 'transactions', icon: History, label: 'Extrato' },
            { id: 'add', icon: Plus, label: 'Novo', isAction: true },
            { id: 'visuals', icon: Target, label: 'Gráficos' },
            { id: 'settings', icon: Settings, label: 'Ajustes' },
          ].map((item) => (
            item.isAction ? (
              <button
                key={item.id}
                onClick={() => setIsFormOpen(true)}
                className="flex flex-col items-center justify-center -mt-8"
              >
                <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none text-white">
                  <Plus size={28} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 mt-1">{item.label}</span>
              </button>
            ) : (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                  activeTab === item.id
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </button>
            )
          ))}
        </div>
      </nav>

      {/* Floating Action Button (Desktop) */}
      <button
        onClick={() => setIsFormOpen(true)}
        className="hidden lg:flex fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-2xl shadow-indigo-300 dark:shadow-none hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* Modals */}
      {isFormOpen && (
        <TransactionForm
          onClose={() => setIsFormOpen(false)}
          onAdd={handleAddTransaction}
          accounts={accounts}
          categories={categories}
          users={users}
          initialUser={currentUser?.id}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      )}

      {isScannerOpen && (
        <ReceiptScanner
          onClose={() => setIsScannerOpen(false)}
          onScan={(data) => {
            setIsScannerOpen(false);
            setIsFormOpen(true);
            // Pre-fill logic would go here
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <Info size={20} />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
