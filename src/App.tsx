
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Wallet, LayoutDashboard, History, Settings, Users, FileText, Filter, XCircle, Target, MessageSquareCode, CheckCircle, Info, Heart, Moon, Sun, Clapperboard, CreditCard, Camera, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { supabaseService } from './services/supabaseService';
import { localService } from './services/localService';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import AIConsultant from './components/AIConsultant';
import Visuals from './components/Visuals';
import Auth from './components/Auth';
import SettingsView from './components/SettingsView';
import GoalsTrack from './components/GoalsTrack';
import StatementImporter from './components/StatementImporter';
import ReceiptScanner from './components/ReceiptScanner';
import LandingPage from './components/LandingPage';
import { Transaction, User, Account, Category, Goal, RecurringTransaction } from './types';
import { INITIAL_TRANSACTIONS, DEFAULT_CATEGORIES } from './constants';
import { format, isSameMonth, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval } from 'date-fns';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

type TabType = 'dashboard' | 'transactions' | 'goals' | 'ai' | 'settings' | 'scanner' | 'visuals';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('finan_ai_is_guest') === 'true');
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(() => localStorage.getItem('finan_ai_started') === 'true');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('finan_ai_theme') as 'light' | 'dark') || 'light');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  
  const [isCoupleMode, setIsCoupleMode] = useState<boolean>(() => localStorage.getItem('finan_ai_couple_mode') === 'true');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [shouldAutoStartVoice, setShouldAutoStartVoice] = useState(false);

  const dataService = useMemo(() => isGuest ? localService : supabaseService, [isGuest]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!isGuest) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        localStorage.setItem('finan_ai_is_guest', 'false');
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  const loadData = useCallback(async () => {
    if (!session && !isGuest) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profile, cats, accs, trans, goalsData, recur] = await Promise.all([
        dataService.getProfile(),
        dataService.getCategories(),
        dataService.getAccounts(),
        dataService.getTransactions(),
        dataService.getGoals(),
        dataService.getRecurringTransactions()
      ]);

      if (profile) {
        const user: User = { id: profile.id, name: profile.name, avatarColor: profile.avatar_color };
        setCurrentUser(user);
        setUsers([user]); // In single user mode, just one user
      }

      setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
      setAccounts(accs);
      setAllTransactions(trans);
      setGoals(goalsData);
      setRecurringTransactions(recur);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Erro ao carregar dados', 'info');
    } finally {
      setLoading(false);
    }
  }, [session, isGuest, dataService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem('finan_ai_started', String(hasStarted));
    localStorage.setItem('finan_ai_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('finan_ai_couple_mode', String(isCoupleMode));
  }, [hasStarted, theme, isCoupleMode]);

  // Check for recurring transactions on load
  useEffect(() => {
    const checkRecurring = async () => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonthYear = `${today.getMonth() + 1}/${today.getFullYear()}`;
      const todayString = today.toISOString().split('T')[0];

      let newTransactions: Transaction[] = [];
      let updatedRecurring: RecurringTransaction[] = [];
      let hasUpdates = false;

      for (const rec of recurringTransactions) {
          if (!rec.active) {
              updatedRecurring.push(rec);
              continue;
          }

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
          if (lastGenDayString === todayString) {
               updatedRecurring.push(rec);
               continue;
          }

          if (lastGenMonthYear !== currentMonthYear && currentDay >= rec.dayOfMonth) {
              // Generate transaction
              const newTrans: Transaction = {
                  id: Math.random().toString(36).substr(2, 9), // Temp ID, will be replaced by DB
                  userId: rec.userId,
                  accountId: rec.accountId,
                  description: rec.description,
                  amount: rec.amount,
                  type: rec.type,
                  category: rec.category,
                  date: todayString,
                  recurrence: 'MONTHLY',
                  isJoint: rec.isJoint
              };
              
              try {
                // Add to Service
                const savedTrans = await dataService.addTransaction(newTrans);
                newTransactions.push(savedTrans);
                
                // Update recurring
                const updatedRec = { ...rec, lastGeneratedDate: new Date().toISOString() };
                await dataService.updateRecurringTransaction(updatedRec);
                updatedRecurring.push(updatedRec);
                
                hasUpdates = true;
              } catch (e) {
                console.error('Error processing recurring transaction', e);
                updatedRecurring.push(rec); // Keep original if failed
              }
          } else {
              updatedRecurring.push(rec);
          }
      }

      if (hasUpdates) {
          setAllTransactions(prev => [...newTransactions, ...prev]);
          setRecurringTransactions(updatedRecurring);
          showToast(`${newTransactions.length} transações recorrentes geradas!`, 'info');
      }
    };

    if ((session || isGuest) && recurringTransactions.length > 0) {
      checkRecurring();
    }
  }, [recurringTransactions, session, isGuest, dataService]);

  useEffect(() => {
    setAccounts(prevAccounts => {
      let hasChanges = false;
      const newAccounts = prevAccounts.map(account => {
        const accountTransactions = allTransactions.filter(t => t.accountId === account.id);
        const totalAmount = accountTransactions.reduce((sum, t) => {
          return sum + (t.type === 'INCOME' ? t.amount : -t.amount);
        }, 0);
        
        // Recalculate balance: initial + transactions
        const newBalance = Math.round((account.initialBalance + totalAmount) * 100) / 100;
        
        if (newBalance !== account.currentBalance) {
          hasChanges = true;
          return { ...account, currentBalance: newBalance };
        }
        return account;
      });

      return hasChanges ? newAccounts : prevAccounts;
    });
  }, [allTransactions, accounts]);

  const updateAccountBalance = async (accountId: string, newCurrentBalance: number) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const accountTransactions = allTransactions.filter(t => t.accountId === accountId);
    const totalTransactions = accountTransactions.reduce((sum, t) => {
      return sum + (t.type === 'INCOME' ? t.amount : -t.amount);
    }, 0);
    
    const newInitialBalance = newCurrentBalance - totalTransactions;
    
    const updatedAccount = {
      ...account,
      initialBalance: newInitialBalance,
      currentBalance: newCurrentBalance
    };

    try {
      await dataService.updateAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === accountId ? updatedAccount : acc));
      showToast('Saldo atualizado!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar saldo', 'info');
    }
  };

  const addTransaction = async (data: Omit<Transaction, 'id' | 'isTemplate'>) => {
    try {
      const newTransaction = await dataService.addTransaction({
        ...data,
        isTemplate: data.recurrence === 'MONTHLY',
        userId: currentUser?.id || (isGuest ? 'guest' : session?.user?.id)
      });
      
      setAllTransactions(prev => [newTransaction, ...prev]);
      showToast('Transação registrada!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar transação', 'info');
    }
  };

  const addAccount = async (acc: Omit<Account, 'id' | 'currentBalance'>) => {
    try {
      const newAccount = await dataService.addAccount(acc);
      setAccounts(prev => [...prev, newAccount]);
      showToast('Nova conta cadastrada!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao criar conta', 'info');
    }
  };

  const updateAccount = async (updatedAccount: Account) => {
    try {
      await dataService.updateAccount(updatedAccount);
      setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
      showToast('Conta atualizada!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar conta', 'info');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await dataService.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      showToast('Conta removida.', 'info');
    } catch (error) {
      console.error(error);
      showToast('Erro ao remover conta', 'info');
    }
  };

  const handleVoiceAction = () => {
    setShouldAutoStartVoice(true);
    setActiveTab('ai');
  };

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => isCoupleMode ? true : t.userId === currentUser?.id);
  }, [allTransactions, currentUser, isCoupleMode]);

  if (!hasStarted) return <LandingPage onStart={() => setHasStarted(true)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth onLogin={() => {}} onGuestLogin={() => {
      setIsGuest(true);
      localStorage.setItem('finan_ai_is_guest', 'true');
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col sticky top-0 h-screen shadow-sm z-30 transition-colors">
        <div className="p-8 flex-1">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <text x="12" y="17" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold">$</text>
                </svg>
              </div>
              <span className="font-extrabold text-xl tracking-tighter block leading-none">Saldo A2</span>
            </div>
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Lançamentos' },
              { id: 'transactions', icon: History, label: 'Meu Extrato' },
              { id: 'visuals', icon: CreditCard, label: 'Gráficos' },
              { id: 'goals', icon: Target, label: 'Metas' },
              { id: 'ai', icon: MessageSquareCode, label: 'Consultor IA' },
              { id: 'settings', icon: Settings, label: 'Ajustes' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
                  activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 
                  'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
          <button onClick={() => setIsCoupleMode(!isCoupleMode)} className={`w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all border ${isCoupleMode ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            <Heart className={`w-5 h-5 ${isCoupleMode ? 'fill-rose-500' : ''}`} />
            {isCoupleMode ? 'Modo Casal' : 'Ativar Casal'}
          </button>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}>
              {currentUser?.name?.charAt(0) || 'G'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{currentUser?.name || 'Convidado'}</p>
              <button onClick={() => {
                if (isGuest) {
                  setIsGuest(false);
                  localStorage.removeItem('finan_ai_is_guest');
                  setSession(null);
                } else {
                  supabase.auth.signOut();
                }
              }} className="text-[10px] text-indigo-600 font-bold uppercase hover:underline">Sair</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 max-w-[1400px] mx-auto w-full pb-24 md:pb-12 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
          <div className="flex items-center justify-between md:block">
            <div>
              <div className="flex items-center gap-2 md:hidden mb-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
                   <svg viewBox="0 0 24 24" className="w-4 h-4 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <text x="12" y="17" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold">$</text>
                   </svg>
                </div>
                <span className="font-extrabold text-sm tracking-tighter text-indigo-900 dark:text-indigo-100">Saldo A2</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              {activeTab === 'dashboard' ? 'Lançamentos' : 
               activeTab === 'transactions' ? 'Meu Extrato' :
               activeTab === 'visuals' ? 'Gráficos' :
               activeTab === 'goals' ? 'Metas' :
               activeTab === 'settings' ? 'Configurações' :
               activeTab === 'ai' ? 'Consultoria IA' : 'Financeiro'}
            </h1>
            <p className="text-slate-400 font-medium">Gerencie suas contas e transações em um só lugar.</p>
          </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            transactions={filteredTransactions} 
            accounts={accounts}
            onManualClick={() => setIsFormOpen(true)}
            onScannerClick={() => setIsScannerOpen(true)}
            onVoiceClick={handleVoiceAction}
            onManageAccounts={() => setActiveTab('settings')}
            onViewVisuals={() => setActiveTab('visuals')}
          />
        )}

        {activeTab === 'visuals' && (
          <Visuals 
            transactions={filteredTransactions} 
            categories={categories} 
            users={users} 
            accounts={accounts}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList 
            transactions={filteredTransactions} 
            users={users} 
            accounts={accounts}
            categories={categories}
            onDelete={async (id) => {
              try {
                await dataService.deleteTransaction(id);
                setAllTransactions(p => p.filter(t => t.id !== id));
                showToast('Transação removida.');
              } catch (e) { showToast('Erro ao remover transação', 'info'); }
            }} 
            onOpenImporter={() => setIsImporterOpen(true)}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsTrack 
            goals={goals} 
            onAddGoal={async (goal) => {
              try {
                const newGoal = await dataService.addGoal({ ...goal, userId: currentUser?.id || (isGuest ? 'guest' : session?.user?.id) });
                setGoals(prev => [...prev, newGoal]);
                showToast('Nova meta criada!');
              } catch (e) {
                console.error(e);
                showToast('Erro ao criar meta', 'info');
              }
            }}
            onUpdateAmount={async (id, amount) => {
              try {
                const goal = goals.find(g => g.id === id);
                if (goal) {
                  const updatedGoal = { ...goal, currentAmount: amount };
                  await dataService.updateGoal(updatedGoal);
                  setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
                  showToast('Progresso atualizado!');
                }
              } catch (e) {
                console.error(e);
                showToast('Erro ao atualizar meta', 'info');
              }
            }}
            onUpdateGoal={async (updatedGoal) => {
              try {
                await dataService.updateGoal(updatedGoal);
                setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
                showToast('Meta atualizada!');
              } catch (e) {
                console.error(e);
                showToast('Erro ao atualizar meta', 'info');
              }
            }}
            onDeleteGoal={async (id) => {
               if (confirm('Tem certeza que deseja excluir esta meta?')) {
                 try {
                   await dataService.deleteGoal(id);
                   setGoals(prev => prev.filter(g => g.id !== id));
                   showToast('Meta excluída.');
                 } catch (e) {
                   console.error(e);
                   showToast('Erro ao excluir meta', 'info');
                 }
               }
            }}
          />
        )}

        {activeTab === 'ai' && (
          <AIConsultant 
            transactions={filteredTransactions} 
            currentUser={currentUser} 
            onAddTransaction={addTransaction}
            autoStartVoice={shouldAutoStartVoice}
            onVoiceHandled={() => setShouldAutoStartVoice(false)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            categories={categories} 
            accounts={accounts}
            recurringTransactions={recurringTransactions}
            onAddCategory={async (c) => {
              try {
                const newCat = await dataService.addCategory(c);
                setCategories(p => [...p, newCat]);
                showToast('Categoria adicionada!');
              } catch (e) { showToast('Erro ao adicionar categoria', 'info'); }
            }} 
            onDeleteCategory={async (id) => {
              try {
                await dataService.deleteCategory(id);
                setCategories(p => p.filter(cat => cat.id !== id));
                showToast('Categoria removida.');
              } catch (e) { showToast('Erro ao remover categoria', 'info'); }
            }} 
            onImportData={c => {}} 
            onAddAccount={addAccount}
            onDeleteAccount={deleteAccount}
            onUpdateAccount={updateAccount}
            onUpdateAccountBalance={updateAccountBalance}
            onAddRecurring={async (rec) => {
              try {
                const newRec = await dataService.addRecurringTransaction({ ...rec, active: true });
                setRecurringTransactions(prev => [...prev, newRec]);
                showToast('Recorrência adicionada!');
              } catch (e) { showToast('Erro ao adicionar recorrência', 'info'); }
            }}
            onDeleteRecurring={async (id) => {
              try {
                await dataService.deleteRecurringTransaction(id);
                setRecurringTransactions(prev => prev.filter(r => r.id !== id));
                showToast('Recorrência removida.', 'info');
              } catch (e) { showToast('Erro ao remover recorrência', 'info'); }
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-3 grid grid-cols-5 gap-1 z-50 safe-area-bottom">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Lançamentos' },
          { id: 'transactions', icon: History, label: 'Extrato' },
          { id: 'visuals', icon: CreditCard, label: 'Gráficos' },
          { id: 'goals', icon: Target, label: 'Metas' }, // Added Goals to mobile nav
          { id: 'settings', icon: Settings, label: 'Ajustes' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center justify-center gap-1 transition-all rounded-xl py-1 ${
              activeTab === item.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'fill-current' : ''}`} />
            <span className="text-[9px] font-bold truncate w-full text-center">{item.label}</span>
          </button>
        ))}
      </nav>

      {isFormOpen && (
        <TransactionForm 
          categories={categories} 
          users={users} 
          accounts={accounts}
          currentUser={currentUser} 
          onAdd={addTransaction} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}

      {isScannerOpen && (
        <ReceiptScanner 
          categories={categories}
          accounts={accounts}
          onConfirm={addTransaction}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {isImporterOpen && (
        <StatementImporter
          categories={categories}
          onImport={(transactions) => {
            transactions.forEach(t => addTransaction({
              ...t,
              recurrence: 'NONE',
              userId: currentUser?.id || 'default',
              accountId: accounts[0]?.id || 'default' // Default account, user can change later or we can add account selector in importer
            }));
            showToast(`${transactions.length} transações importadas!`);
            setIsImporterOpen(false);
          }}
          onClose={() => setIsImporterOpen(false)}
        />
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
