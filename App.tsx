
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Settings, Target, MessageSquareCode, CheckCircle, Heart, Moon, Sun, CreditCard, LogOut, TrendingUp, CalendarCheck, Users, ArrowUpCircle, ShieldCheck, Sparkles, Bell } from 'lucide-react';
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
import Auth from './components/Auth';
import CashFlow from './components/CashFlow';
import TransactionValidation from './components/TransactionValidation';
import InstallmentsView from './components/InstallmentsView';
import AdminPanel from './components/AdminPanel';
import SubscriptionModal from './components/SubscriptionModal';
import InviteFamilyModal from './components/InviteFamilyModal';
import RemindersModal from './components/RemindersModal';
import { Transaction } from './types';
import { addMonths, format, parseISO } from 'date-fns';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useFinancialData } from './hooks/useFinancialData';

type TabType = 'dashboard' | 'transactions' | 'cashflow' | 'validation' | 'parcelados' | 'goals' | 'ai' | 'settings' | 'scanner' | 'visuals' | 'admin';

const AppContent: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    transactions, 
    categories, 
    accounts: rawAccounts, 
    goals, 
    recurringTransactions, 
    installmentGroups,
    currentUserProfile,
    users,
    fetchData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    bulkDeleteTransactions,
    addAccount,
    updateAccount,
    deleteAccount,
    addGoal,
    updateGoal,
    deleteGoal,
    addRecurring,
    deleteRecurring,
    updateRecurring,
    addInstallmentGroup,
    deleteInstallmentGroup,
    addCategory,
    updateCategory,
    deleteCategory,
    importData,
    setTransactions, // For optimistic updates if needed
    setRecurringTransactions,
    updateUserProfile,
    linkUser,
    unlinkUser,
    importRules,
    saveImportRule,
    deleteImportRule,
    clearImportRules
  } = useFinancialData();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('finan_ai_theme') as 'light' | 'dark') || 'light');
  const [isCoupleMode, setIsCoupleMode] = useState<boolean>(() => localStorage.getItem('finan_ai_couple_mode') === 'true');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [shouldAutoStartVoice, setShouldAutoStartVoice] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationCount, setLastNotificationCount] = useState(-1);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('finan_ai_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('finan_ai_couple_mode', String(isCoupleMode));
  }, [theme, isCoupleMode]);

  useEffect(() => {
    if (activeTab !== 'settings') {
      setSettingsInitialSection(undefined);
    }
  }, [activeTab]);

  // Calculate Account Balances dynamically
  const accounts = useMemo(() => {
    return rawAccounts.map(account => {
      const totalAmount = transactions.filter(t => !t.isTemplate).reduce((sum, t) => {
        if (t.accountId === account.id) {
          if (t.type === 'INCOME') return sum + t.amount;
          return sum - t.amount; // EXPENSE or TRANSFER (source)
        }
        if (t.toAccountId === account.id && t.type === 'TRANSFER') {
          return sum + t.amount; // TRANSFER (destination)
        }
        return sum;
      }, 0);
      return {
        ...account,
        currentBalance: Math.round((account.initialBalance + totalAmount) * 100) / 100
      };
    });
  }, [rawAccounts, transactions]);

  // Tomorrow's Reminders calculation
  const tomorrowReminders = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const tomorrowDay = tomorrow.getDate();

    const list: { id: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; description: string; amount: number; isRecurring: boolean; category: string }[] = [];

    // 1. Recurring Transactions due tomorrow
    recurringTransactions.forEach(rt => {
      if (rt.active && rt.dayOfMonth === tomorrowDay) {
        list.push({
          id: `rec-${rt.id}`,
          type: rt.type,
          description: rt.description,
          amount: rt.amount,
          isRecurring: true,
          category: rt.category
        });
      }
    });

    // 2. Installment templates & scheduled payments due tomorrow
    transactions.forEach(t => {
      if (t.date === tomorrowStr) {
        list.push({
          id: `trans-${t.id}`,
          type: t.type,
          description: t.isTemplate ? `${t.description} (${t.installmentNumber}/${t.totalInstallments})` : t.description,
          amount: t.amount,
          isRecurring: false,
          category: t.category
        });
      }
    });

    return list;
  }, [recurringTransactions, transactions]);

  useEffect(() => {
    if (tomorrowReminders.length !== lastNotificationCount) {
      setUnreadCount(tomorrowReminders.length);
      setLastNotificationCount(tomorrowReminders.length);
    }
  }, [tomorrowReminders, lastNotificationCount]);

  // Check for recurring transactions - REMOVED AUTO-GENERATION
  // Now handled by TransactionValidation component manually

  const handleVoiceAction = () => {
    setShouldAutoStartVoice(true);
    setActiveTab('ai');
  };

  const filteredTransactions = useMemo(() => {
    // If couple mode is OFF, show only personal transactions (userId matches current user)
    // If couple mode is ON, show ALL transactions (Personal + Joint + Partner's)
    let baseTransactions = transactions;
    
    // Hide regular templates (projections) from the main statement
    baseTransactions = baseTransactions.filter(t => !t.isTemplate);

    if (!isCoupleMode) {
        return baseTransactions.filter(t => t.userId === user?.id);
    }
    return baseTransactions;
  }, [transactions, isCoupleMode, user?.id]);

  const filteredInstallmentGroups = useMemo(() => {
    if (!isCoupleMode) {
        return installmentGroups.filter(ig => ig.userId === user?.id);
    }
    return installmentGroups;
  }, [installmentGroups, isCoupleMode, user?.id]);

  const filteredRawTransactions = useMemo(() => {
    if (!isCoupleMode) {
        return transactions.filter(t => t.userId === user?.id);
    }
    return transactions;
  }, [transactions, isCoupleMode, user?.id]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  
  // Protected Route Logic
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Use currentUserProfile or fallback
  const displayUser = currentUserProfile || { id: user.id, name: user.email?.split('@')[0] || 'User', avatarColor: '#6366f1' };
  const usersList = users.length > 0 ? users : [displayUser]; // For components that expect a list

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col sticky top-0 h-screen shadow-sm z-30 transition-colors print:hidden">
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
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setUnreadCount(0);
                  setIsRemindersOpen(true);
                }} 
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative"
                title="Lembretes de amanhã"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" title="Mudar cor da tela">
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <nav className="space-y-2">
            {(() => {
              const menuItems = [
                { id: 'dashboard', icon: LayoutDashboard, label: 'Lançamentos' },
                { id: 'transactions', icon: History, label: 'Meu Extrato' },
                { id: 'cashflow', icon: TrendingUp, label: 'Resumo' },
                { id: 'validation', icon: CalendarCheck, label: 'Recorrentes' },
                { id: 'parcelados', icon: CreditCard, label: 'Parcelados' },
                { id: 'visuals', icon: CreditCard, label: 'Gráficos' },
                { id: 'goals', icon: Target, label: 'Metas' },
                { id: 'ai', icon: MessageSquareCode, label: 'Consultor IA' },
                { id: 'settings', icon: Settings, label: 'Ajustes' },
              ];

              if (currentUserProfile?.role === 'admin') {
                menuItems.push({ id: 'admin', icon: ShieldCheck, label: 'Painel Admin' });
              }

              return menuItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all text-sm ${
                    activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 
                    'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ));
            })()}
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
          <div className="mb-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Plano Atual</p>
                <p className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase">
                  {currentUserProfile?.tier === 'premium' ? '👑 Premium' :
                   currentUserProfile?.tier === 'medio' ? '⭐ Médio' :
                   currentUserProfile?.tier === 'basico' ? '✨ Básico' : '🆓 Grátis'}
                </p>
              </div>
              {currentUserProfile?.tier !== 'premium' && (
                <button 
                  onClick={() => setIsSubscriptionOpen(true)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all animate-pulse"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: displayUser.avatarColor }}>
              {displayUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{displayUser.name}</p>
              <button onClick={() => {
                signOut();
                navigate('/');
              }} className="text-[10px] text-red-500 font-bold uppercase hover:underline flex items-center gap-1">
                <LogOut className="w-3 h-3" /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 max-w-[1400px] mx-auto w-full pb-24 md:pb-12 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-12 print:hidden">
          <div className="flex items-center justify-between md:block w-full">
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
               activeTab === 'cashflow' ? 'Resumo' :
               activeTab === 'validation' ? 'Recorrentes' :
               activeTab === 'parcelados' ? 'Parcelamentos' :
               activeTab === 'visuals' ? 'Gráficos' :
               activeTab === 'goals' ? 'Metas' :
               activeTab === 'settings' ? 'Configurações' :
               activeTab === 'admin' ? 'Painel Admin' :
               activeTab === 'ai' ? 'Consultoria IA' : 'Financeiro'}
             </h1>
             <p className="hidden md:block text-slate-400 font-medium">Gerencie suas contas e transações em um só lugar.</p>
            </div>

            {/* Botão de mudar cor da tela (tema) no cantinho da tela em cima no modo mobile */}
            <div className="md:hidden flex items-center gap-2">
              <button 
                onClick={() => {
                  setUnreadCount(0);
                  setIsRemindersOpen(true);
                }} 
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 transition-all active:scale-95 shadow-sm relative"
                title="Lembretes de amanhã"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 transition-all active:scale-95 shadow-sm"
                title="Mudar cor da tela"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
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
            spendingCeiling={currentUserProfile?.spendingCeiling}
            currentUserProfile={currentUserProfile}
            onUpgradeClick={() => setIsSubscriptionOpen(true)}
            onInviteClick={() => setIsInviteModalOpen(true)}
            recurringTransactions={recurringTransactions}
            allRawTransactions={transactions}
          />
        )}

        {activeTab === 'cashflow' && (
          <CashFlow 
            transactions={filteredTransactions} 
            accounts={accounts}
            categories={categories}
          />
        )}

        {activeTab === 'validation' && (
          <TransactionValidation 
            recurringTransactions={recurringTransactions}
            transactions={filteredTransactions}
            onValidate={async (t) => {
              try {
                await addTransaction(t);
                showToast('Lançamento confirmado!');
              } catch (error: any) {
                console.error('Erro na validação:', error);
                showToast(`Erro: ${error.message || 'Falha ao confirmar'}`);
              }
            }}
            onDelete={(id) => {
              deleteTransaction(id);
              showToast('Lançamento estornado.');
            }}
            onUpdateRecurring={updateRecurring}
            onDeleteRecurring={deleteRecurring}
            onAddRecurring={addRecurring}
            currentUserProfile={currentUserProfile}
            currentDate={new Date()} // Could be state for month navigation
            categories={categories}
            accounts={accounts}
          />
        )}

        {activeTab === 'parcelados' && (
          <InstallmentsView 
            installmentGroups={filteredInstallmentGroups}
            transactions={filteredRawTransactions} // Pass filtered transactions to show templates for current user/couple
            onAdd={async (g, customItems) => {
                await addInstallmentGroup(g, customItems);
                showToast('Parcelamento criado e lançamentos gerados!');
            }}
            onDelete={async (id, deleteTrans) => {
                await deleteInstallmentGroup(id, deleteTrans);
                showToast(deleteTrans ? 'Parcelamento e lançamentos excluídos.' : 'Contrato de parcelamento excluído.');
            }}
            onValidate={async (t: any) => {
                try {
                    if (t.id) {
                        await updateTransaction({ ...t, isTemplate: false });
                        showToast('Lançamento confirmado no extrato!');
                    } else {
                        await addTransaction(t);
                        showToast('Lançamento adicionado!');
                    }
                } catch (error: any) {
                    showToast(`Erro ao validar: ${error.message || 'Falha'}`, 'info');
                }
            }}
            onDeleteTransaction={deleteTransaction}
            accounts={accounts}
            categories={categories}
          />
        )}

        {activeTab === 'visuals' && (
          <Visuals 
            transactions={filteredTransactions} 
            categories={categories} 
            users={usersList} 
            accounts={accounts}
            recurringTransactions={recurringTransactions}
            installmentGroups={installmentGroups}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList 
            transactions={filteredTransactions} 
            users={usersList} 
            accounts={accounts}
            categories={categories}
            onDelete={deleteTransaction} 
            onBulkDelete={bulkDeleteTransactions}
            onOpenImporter={() => setIsImporterOpen(true)}
            onEdit={(t) => {
                setEditingTransaction(t);
                setIsFormOpen(true);
            }}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsTrack 
            goals={goals} 
            onAddGoal={(goal) => addGoal(goal)}
            onUpdateAmount={(id, amount) => {
              const goal = goals.find(g => g.id === id);
              if (goal) updateGoal({ ...goal, currentAmount: amount });
            }}
            onUpdateGoal={updateGoal}
            onDeleteGoal={(id) => {
               if (confirm('Tem certeza que deseja excluir esta meta?')) {
                 deleteGoal(id);
                 showToast('Meta excluída.');
               }
            }}
          />
        )}

        {activeTab === 'ai' && (
          <AIConsultant 
            transactions={filteredTransactions} 
            accounts={accounts}
            currentUser={displayUser} 
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
            transactions={transactions}
            onAddCategory={addCategory} 
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory} 
            onImportData={async (data) => {
                const success = await importData(data);
                if (success) showToast('Dados importados com sucesso!');
                else showToast('Erro ao importar dados.', 'info');
            }} 
            onAddAccount={addAccount}
            onDeleteAccount={deleteAccount}
            onUpdateAccount={updateAccount}
            onUpdateAccountBalance={(id, balance) => {
                const acc = accounts.find(a => a.id === id);
                if (acc) {
                    // Recalculate initial balance
                    const accountTransactions = transactions.filter(t => t.accountId === id);
                    const totalTransactions = accountTransactions.reduce((sum, t) => {
                        return sum + (t.type === 'INCOME' ? t.amount : -t.amount);
                    }, 0);
                    const newInitial = balance - totalTransactions;
                    updateAccount({ ...acc, initialBalance: newInitial });
                    showToast('Saldo atualizado!');
                }
            }}
            onAddRecurring={addRecurring}
            onUpdateRecurring={updateRecurring}
            onDeleteRecurring={deleteRecurring}
            spendingCeiling={currentUserProfile?.spendingCeiling}
            onUpdateSpendingCeiling={(amount) => {
                updateUserProfile({ spendingCeiling: amount });
                showToast('Teto de gastos atualizado!');
            }}
            onUpdateProfile={(updates) => {
                updateUserProfile(updates);
                showToast('Perfil atualizado!');
            }}
            currentUserProfile={currentUserProfile}
            users={users}
            onLinkUser={linkUser}
            onUnlinkUser={unlinkUser}
            isCoupleMode={isCoupleMode}
            onToggleCoupleMode={setIsCoupleMode}
            theme={theme}
            onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            importRules={importRules}
            onDeleteImportRule={deleteImportRule}
            onClearImportRules={clearImportRules}
            initialOpenSection={settingsInitialSection}
          />
        )}

        {activeTab === 'admin' && currentUserProfile?.role === 'admin' && (
          <AdminPanel currentUser={displayUser} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-1 py-1 flex overflow-x-auto z-50 safe-area-bottom no-scrollbar">
        {(() => {
          const mobileItems = [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Lançamentos' },
            { id: 'transactions', icon: History, label: 'Extrato' },
            { id: 'parcelados', icon: CreditCard, label: 'Parcelados' },
            { id: 'validation', icon: CalendarCheck, label: 'Recorrente' },
            { id: 'visuals', icon: TrendingUp, label: 'Gráficos' },
            { id: 'cashflow', icon: ArrowUpCircle, label: 'Resumo' },
            { id: 'ai', icon: MessageSquareCode, label: 'IA' },
            { id: 'settings', icon: Settings, label: 'Ajustes' },
          ];

          if (currentUserProfile?.role === 'admin') {
            mobileItems.push({ id: 'admin', icon: ShieldCheck, label: 'Admin' });
          }

          return mobileItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex flex-col items-center justify-center gap-1 transition-all rounded-xl py-2 px-1 min-w-[56px] ${
                activeTab === item.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'fill-current' : ''}`} />
              <span className="text-[8px] font-bold truncate w-full text-center">{item.label}</span>
            </button>
          ));
        })()}
      </nav>

      {isFormOpen && (
        <TransactionForm 
          categories={categories} 
          users={usersList} 
          accounts={accounts}
          currentUser={displayUser}
          initialData={editingTransaction || undefined}
          onAdd={async (t) => {
              try {
                if (t.id) {
                    await updateTransaction({ ...t, id: t.id } as Transaction);
                    showToast('Lançamento atualizado!');
                } else {
                    if (t.installments && t.installments > 1) {
                        const baseDate = parseISO(t.date);
                        const totalAmount = t.amount * t.installments;
                        const customItems = [];
                        for (let i = 0; i < t.installments; i++) {
                            const newDate = addMonths(baseDate, i);
                            customItems.push({
                                number: i + 1,
                                date: format(newDate, 'yyyy-MM-dd'),
                                amount: t.amount,
                                description: `${t.description} (${i + 1}/${t.installments})`
                            });
                        }
                        await addInstallmentGroup({
                            userId: displayUser.id,
                            accountId: t.accountId,
                            description: t.description,
                            totalAmount: totalAmount,
                            installmentAmount: t.amount,
                            totalInstallments: t.installments,
                            startDate: t.date,
                            intervalDays: 30,
                            category: t.category,
                            type: t.type,
                            isJoint: t.isJoint
                        }, customItems);
                        showToast(`${t.installments} parcelas adicionadas sob confirmação!`);
                    } else {
                        await addTransaction(t);
                        showToast('Lançamento adicionado!');
                    }
                }
              } catch (error: any) {
                console.error('Erro ao salvar:', error);
                showToast(`Erro ao salvar: ${error.message || 'Verifique sua conexão ou banco de dados'}`, 'info');
              }
          }} 
          onClose={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
          }} 
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
          accounts={accounts}
          importRules={importRules}
          onSaveRule={saveImportRule}
          onImport={(importedTransactions, targetAccountId) => {
            importedTransactions.forEach(t => addTransaction({
              ...t,
              recurrence: 'NONE',
              userId: displayUser.id,
              accountId: targetAccountId || accounts[0]?.id || 'default'
            }));
            showToast(`${importedTransactions.length} transações importadas!`);
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

      {/* Hidden button for Subscription Modal trigger from sub-components */}
      <button 
        id="trigger-subscription-modal" 
        onClick={() => setIsSubscriptionOpen(true)} 
        className="hidden pointer-events-none"
        aria-hidden="true"
      />

      {isSubscriptionOpen && currentUserProfile && (
        <SubscriptionModal 
          isOpen={isSubscriptionOpen} 
          onClose={() => setIsSubscriptionOpen(false)} 
          currentUser={currentUserProfile}
          onTierUpdated={fetchData}
        />
      )}

      {isInviteModalOpen && (
        <InviteFamilyModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          currentUserProfile={currentUserProfile}
          users={users}
          onLinkUser={(code) => {
            linkUser(code);
            showToast('Família conectada com sucesso!');
          }}
          onUnlinkUser={(id) => {
            unlinkUser(id);
            showToast('Membro removido da família.');
          }}
          isCoupleMode={isCoupleMode}
          onToggleCoupleMode={setIsCoupleMode}
          onUpdateProfile={(updates) => {
            updateUserProfile(updates);
            showToast('Nome de exibição atualizado!');
          }}
        />
      )}

      {isRemindersOpen && (
        <RemindersModal 
          isOpen={isRemindersOpen}
          onClose={() => setIsRemindersOpen(false)}
          reminders={tomorrowReminders}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage onStart={() => {}} />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/sistema" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
