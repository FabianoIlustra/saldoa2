
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, History, Settings, Target, MessageSquareCode, CheckCircle, Heart, Moon, Sun, CreditCard, LogOut, TrendingUp, CalendarCheck, Users, ArrowUpCircle, ShieldCheck, Sparkles, Bell, Edit2, Lock } from 'lucide-react';
import { getPricingConfig } from './services/adminSettings';
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
import EditProfileModal from './components/EditProfileModal';
import { Transaction } from './types';
import { addMonths, format, parseISO } from 'date-fns';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useFinancialData } from './hooks/useFinancialData';
import { isLocalModeEnabled } from './services/geminiService';

type TabType = 'dashboard' | 'transactions' | 'cashflow' | 'validation' | 'parcelados' | 'goals' | 'ai' | 'settings' | 'scanner' | 'visuals' | 'admin';

const formatDisplayName = (rawName?: string) => {
  if (!rawName) return 'Usuário';
  const trimmed = rawName.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return trimmed;
};

const LockedFeatureCard: React.FC<{ featureName: string; onUpgrade: () => void }> = ({
  featureName,
  onUpgrade
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 md:p-12 text-center max-w-xl mx-auto shadow-sm space-y-6 animate-fadeIn my-12">
    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
      <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
    </div>
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full">
        Recurso Restrito ao Plano
      </span>
      <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
        Aba de {featureName} Bloqueada
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
        Esta aba não está liberada no seu plano atual. Você pode atualizar seu plano para liberar este recurso instantaneamente.
      </p>
    </div>
    <button
      onClick={onUpgrade}
      className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
    >
      <Sparkles className="w-4 h-4" />
      Ver Planos e Fazer Upgrade
    </button>
  </div>
);

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
    updateInstallmentGroup,
    updateSingleInstallment,
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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationCount, setLastNotificationCount] = useState(-1);
  const [localMode, setLocalMode] = useState(() => isLocalModeEnabled());

  useEffect(() => {
    const handleLocalModeChange = () => {
      setLocalMode(isLocalModeEnabled());
    };
    window.addEventListener('local-mode-change', handleLocalModeChange);
    return () => {
      window.removeEventListener('local-mode-change', handleLocalModeChange);
    };
  }, []);

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

  // Active Reminders calculation: Due Today (day of due date) and Tomorrow (day before due date)
  const activeReminders = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const tomorrowDay = tomorrow.getDate();
    const tomorrowMonth = tomorrow.getMonth();
    const tomorrowYear = tomorrow.getFullYear();

    const list: { id: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; description: string; amount: number; isRecurring: boolean; category: string; dueLabel: 'Hoje' | 'Amanhã'; dueDate: string }[] = [];

    // 1. Recurring Transactions due Today or Tomorrow
    recurringTransactions.forEach(rt => {
      if (!rt.active) return;

      // Check if due TODAY
      if (rt.dayOfMonth === todayDay) {
        const isPaid = transactions.some(t => {
          if (t.isTemplate) return false;
          if (t.type !== rt.type) return false;
          const tDate = parseISO(t.date);
          const isSamePeriod = tDate.getMonth() === todayMonth && tDate.getFullYear() === todayYear;
          const descMatch = t.description.trim().toLowerCase() === rt.description.trim().toLowerCase();
          return isSamePeriod && descMatch;
        });

        if (!isPaid) {
          list.push({
            id: `rec-${rt.id}-today`,
            type: rt.type,
            description: rt.description,
            amount: rt.amount,
            isRecurring: true,
            category: rt.category,
            dueLabel: 'Hoje',
            dueDate: todayStr
          });
        }
      }

      // Check if due TOMORROW
      if (rt.dayOfMonth === tomorrowDay) {
        const isPaid = transactions.some(t => {
          if (t.isTemplate) return false;
          if (t.type !== rt.type) return false;
          const tDate = parseISO(t.date);
          const isSamePeriod = tDate.getMonth() === tomorrowMonth && tDate.getFullYear() === tomorrowYear;
          const descMatch = t.description.trim().toLowerCase() === rt.description.trim().toLowerCase();
          return isSamePeriod && descMatch;
        });

        if (!isPaid) {
          list.push({
            id: `rec-${rt.id}-tomorrow`,
            type: rt.type,
            description: rt.description,
            amount: rt.amount,
            isRecurring: true,
            category: rt.category,
            dueLabel: 'Amanhã',
            dueDate: tomorrowStr
          });
        }
      }
    });

    // 2. Installment templates & scheduled payments due Today or Tomorrow
    transactions.forEach(t => {
      if (!t.isTemplate) return;

      // Due TODAY
      if (t.date === todayStr) {
        const isPaid = transactions.some(realT => {
          if (realT.isTemplate) return false;
          if (realT.type !== t.type) return false;
          if (t.installmentGroupId && t.installmentNumber && realT.installmentGroupId && realT.installmentNumber) {
            return String(realT.installmentGroupId) === String(t.installmentGroupId) &&
                   Number(realT.installmentNumber) === Number(t.installmentNumber);
          }
          const realDate = parseISO(realT.date);
          return realT.description.trim().toLowerCase() === t.description.trim().toLowerCase() &&
                 realDate.getMonth() === todayMonth &&
                 realDate.getFullYear() === todayYear;
        });

        if (!isPaid) {
          list.push({
            id: `trans-${t.id}-today`,
            type: t.type,
            description: t.totalInstallments ? `${t.description} (${t.installmentNumber}/${t.totalInstallments})` : t.description,
            amount: t.amount,
            isRecurring: false,
            category: t.category,
            dueLabel: 'Hoje',
            dueDate: todayStr
          });
        }
      }

      // Due TOMORROW
      if (t.date === tomorrowStr) {
        const isPaid = transactions.some(realT => {
          if (realT.isTemplate) return false;
          if (realT.type !== t.type) return false;
          if (t.installmentGroupId && t.installmentNumber && realT.installmentGroupId && realT.installmentNumber) {
            return String(realT.installmentGroupId) === String(t.installmentGroupId) &&
                   Number(realT.installmentNumber) === Number(t.installmentNumber);
          }
          const realDate = parseISO(realT.date);
          return realT.description.trim().toLowerCase() === t.description.trim().toLowerCase() &&
                 realDate.getMonth() === tomorrowMonth &&
                 realDate.getFullYear() === tomorrowYear;
        });

        if (!isPaid) {
          list.push({
            id: `trans-${t.id}-tomorrow`,
            type: t.type,
            description: t.totalInstallments ? `${t.description} (${t.installmentNumber}/${t.totalInstallments})` : t.description,
            amount: t.amount,
            isRecurring: false,
            category: t.category,
            dueLabel: 'Amanhã',
            dueDate: tomorrowStr
          });
        }
      }
    });

    return list;
  }, [recurringTransactions, transactions]);

  useEffect(() => {
    if (activeReminders.length !== lastNotificationCount) {
      setUnreadCount(activeReminders.length);
      setLastNotificationCount(activeReminders.length);
    }
  }, [activeReminders, lastNotificationCount]);

  // Scroll to top whenever activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Check for recurring transactions - REMOVED AUTO-GENERATION
  // Now handled by TransactionValidation component manually

  const handleVoiceAction = () => {
    setShouldAutoStartVoice(false);
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

  const filteredGoals = useMemo(() => {
    if (!isCoupleMode) {
        return goals.filter(g => g.userId === user?.id);
    }
    return goals;
  }, [goals, isCoupleMode, user?.id]);

  const filteredRawTransactions = useMemo(() => {
    if (!isCoupleMode) {
        return transactions.filter(t => t.userId === user?.id);
    }
    return transactions;
  }, [transactions, isCoupleMode, user?.id]);

  const isLinkedCouple = Boolean(currentUserProfile?.coupleId || (users && users.length > 1));
  const isPremiumOrAdmin = currentUserProfile?.tier === 'premium' || currentUserProfile?.role === 'admin';

  // Automatically default system to Couple Mode if user is linked in a couple/family account
  useEffect(() => {
    if (isLinkedCouple) {
      setIsCoupleMode(true);
    }
  }, [isLinkedCouple]);

  const activeUserTier = currentUserProfile?.role === 'admin' || currentUserProfile?.isTrial 
    ? 'premium' 
    : (currentUserProfile?.tier || 'gratis');

  const currentPlanLimits = useMemo(() => {
    const pricing = getPricingConfig();
    return pricing[activeUserTier]?.limits || pricing['gratis']?.limits || {
      accounts: 1,
      transactions: 15,
      goals: 1,
      recurringCount: 2,
      installmentsCount: 2,
      hasVoice: false,
      hasCouple: false,
      hasImport: false,
      hasRecurring: false,
      hasInstallments: false,
      hasCharts: false,
      hasGoalsTab: true,
      hasAiConsultant: false,
      hasReceiptPhoto: false,
    };
  }, [activeUserTier]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  
  // Protected Route Logic
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Use currentUserProfile or fallback
  const displayUser = currentUserProfile || { id: user.id, name: user.email?.split('@')[0] || 'User', avatarColor: '#6366f1' };
  const usersList = users.length > 0 ? users : [displayUser]; // For components that expect a list

  const isTabLocked = (tabId: string) => {
    if (currentUserProfile?.role === 'admin' || currentUserProfile?.isTrial) return false;
    if (tabId === 'validation') return currentPlanLimits.hasRecurring === false;
    if (tabId === 'parcelados') return currentPlanLimits.hasInstallments === false;
    if (tabId === 'visuals') return currentPlanLimits.hasCharts === false;
    if (tabId === 'goals') return currentPlanLimits.hasGoalsTab === false;
    if (tabId === 'ai') return currentPlanLimits.hasAiConsultant === false;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col sticky top-0 h-screen shadow-sm z-30 transition-colors print:hidden">
        <div className="p-8 flex-1">
          <div className="flex items-center mb-12">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L12 2.5L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
                  <text x="12" y="16.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">$</text>
                </svg>
              </div>
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight block leading-none text-slate-900 dark:text-white whitespace-nowrap">
                Saldo A<span className="text-indigo-600 dark:text-indigo-400">2</span>
              </span>
            </div>
          </div>

          <nav className="space-y-2">
            {(() => {
              const menuItems = [
                { id: 'dashboard', icon: Home, label: 'Início', color: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'transactions', icon: History, label: 'Extrato', color: 'text-emerald-600 dark:text-emerald-400' },
                { id: 'cashflow', icon: TrendingUp, label: 'Resumo', color: 'text-violet-600 dark:text-violet-400' },
                { id: 'validation', icon: CalendarCheck, label: 'Recorrentes', color: 'text-amber-600 dark:text-amber-400' },
                { id: 'parcelados', icon: CreditCard, label: 'Parcelados', color: 'text-rose-600 dark:text-rose-400' },
                { id: 'visuals', icon: TrendingUp, label: 'Gráficos', color: 'text-sky-600 dark:text-sky-400' },
                { id: 'goals', icon: Target, label: 'Metas', color: 'text-teal-600 dark:text-teal-400' },
                { id: 'ai', icon: MessageSquareCode, label: 'Consultor IA', color: 'text-purple-600 dark:text-purple-400' },
                { id: 'settings', icon: Settings, label: 'Configurações', color: 'text-slate-600 dark:text-slate-300' },
              ];

              if (currentUserProfile?.role === 'admin') {
                menuItems.push({ id: 'admin', icon: ShieldCheck, label: 'Painel Admin', color: 'text-red-600 dark:text-red-400' });
              }

              return menuItems.map(item => {
                const locked = isTabLocked(item.id);
                const isActive = activeTab === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-extrabold transition-all text-sm ${
                      isActive 
                        ? 'bg-blue-100/90 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/60 shadow-xs' 
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="flex items-center gap-3.5">
                      <item.icon className={`w-5 h-5 ${item.color} ${isActive ? 'scale-110' : 'opacity-90'} transition-transform`} />
                      <span>{item.label}</span>
                    </span>
                    {locked && (
                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Recurso bloqueado para o seu plano" />
                    )}
                  </button>
                );
              });
            })()}
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
          <div className="mb-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Plano Atual</p>
                <p className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase">
                  {currentUserProfile?.isTrial ? '👑 Teste Premium' :
                   currentUserProfile?.tier === 'premium' ? '👑 Premium' :
                   currentUserProfile?.tier === 'medio' ? '⭐ Médio' :
                   currentUserProfile?.tier === 'basico' ? '✨ Básico' : '🆓 Grátis'}
                </p>
                {currentUserProfile?.isTrial && (
                  <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                    Restam {currentUserProfile.trialDaysRemaining ?? 7} dias
                  </p>
                )}
              </div>
              {!isPremiumOrAdmin && (
                <button 
                  onClick={() => setIsSubscriptionOpen(true)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all animate-pulse"
                >
                  {currentUserProfile?.isTrial ? 'Garantir' : 'Upgrade'}
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

      <main className={`flex-1 p-3.5 md:p-12 max-w-[1400px] mx-auto w-full ${activeTab === 'ai' ? 'pb-20 md:pb-12' : 'pb-24 md:pb-12'} overflow-x-hidden`}>
        <header className={`${activeTab === 'ai' ? 'mb-3 md:mb-12' : 'mb-6 md:mb-12'} print:hidden`}>
          {/* Mobile Header Structure (static & persistent across tabs, borderless layout) */}
          <div className="md:hidden flex flex-col gap-3 w-full py-1">
            {/* Mobile Row 1: Brand + Plano Badge */}
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5L12 2.5L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
                    <text x="12" y="16.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">$</text>
                  </svg>
                </div>
                <span className="font-black text-lg sm:text-xl tracking-tight text-indigo-950 dark:text-indigo-100 whitespace-nowrap">
                  Saldo A<span className="text-indigo-600 dark:text-indigo-400">2</span>
                </span>
              </div>

              {/* Plan Badge + Upgrade */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2.5 py-1 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-400">Plano</span>
                <span className="text-indigo-600 dark:text-indigo-400 uppercase font-black text-xs">
                  {currentUserProfile?.isTrial 
                    ? `👑 Teste (${currentUserProfile.trialDaysRemaining ?? 7}d)`
                    : (currentUserProfile?.tier || 'gratis')}
                </span>
                {!isPremiumOrAdmin && (
                  <button 
                    type="button"
                    onClick={() => setIsSubscriptionOpen(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    title="Clique para ver planos e fazer upgrade"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Row 2: Page Title / Profile + Action Buttons */}
            <div className="flex items-center justify-between w-full gap-2 pt-1">
              <div className="min-w-0 flex-1">
                {activeTab === 'dashboard' ? (
                  <button 
                    onClick={() => setIsEditProfileOpen(true)}
                    className="flex items-center gap-2.5 p-0.5 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all text-left group min-w-0"
                    title="Clique para editar seu perfil"
                  >
                    <div className="relative shrink-0">
                      {currentUserProfile?.avatarUrl ? (
                        <img 
                          src={currentUserProfile.avatarUrl} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/30 group-hover:ring-purple-500 shadow-sm"
                        />
                      ) : currentUserProfile?.avatarEmoji ? (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ring-2 ring-purple-500/20 group-hover:ring-purple-500 transition-all"
                          style={{ backgroundColor: currentUserProfile?.avatarColor || '#6366f1' }}
                        >
                          {currentUserProfile.avatarEmoji}
                        </div>
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shadow-sm ring-2 ring-purple-500/20 group-hover:ring-purple-500 transition-all"
                          style={{ backgroundColor: currentUserProfile?.avatarColor || '#6366f1' }}
                        >
                          {formatDisplayName(currentUserProfile?.name || displayUser.name).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Edit2 className="w-2 h-2" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block leading-none mb-0.5">
                        Olá,
                      </span>
                      <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{formatDisplayName(currentUserProfile?.name || displayUser.name)}!</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsInviteModalOpen(true);
                          }}
                          className="p-1 rounded-lg bg-blue-100/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-all flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60"
                          title="Usuários Vinculados & Modo Família"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </span>
                      </h1>
                    </div>
                  </button>
                ) : (
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {activeTab === 'transactions' ? 'Extrato' :
                     activeTab === 'cashflow' ? 'Resumo' :
                     activeTab === 'validation' ? 'Recorrentes' :
                     activeTab === 'parcelados' ? 'Parcelamentos' :
                     activeTab === 'visuals' ? 'Gráficos' :
                     activeTab === 'goals' ? 'Metas' :
                     activeTab === 'settings' ? 'Configurações' :
                     activeTab === 'admin' ? 'Painel Admin' :
                     activeTab === 'ai' ? 'Consultoria IA' : 'Financeiro'}
                  </h1>
                )}
              </div>

              {/* Action Buttons (Bell, Theme, Settings/Home) - Generous Touch Target on Mobile */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => {
                    setUnreadCount(0);
                    setIsRemindersOpen(true);
                  }} 
                  className="p-2.5 sm:p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95 shadow-2xs relative"
                  title="Lembretes de Hoje e Amanhã"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                  className="p-2.5 sm:p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all active:scale-95 shadow-2xs"
                  title="Mudar cor da tela"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setActiveTab(activeTab === 'settings' ? 'dashboard' : 'settings')} 
                  className={`p-2.5 sm:p-2 rounded-2xl border transition-all active:scale-95 shadow-2xs ${
                    activeTab === 'settings'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                  title={activeTab === 'settings' ? "Início" : "Configurações"}
                >
                  {activeTab === 'settings' ? <Home className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Header Structure */}
          <div className="hidden md:flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {activeTab === 'dashboard' ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsEditProfileOpen(true)}
                    className="flex items-center gap-3 p-1 -ml-1 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all text-left group"
                    title="Clique para editar seu perfil"
                  >
                    <div className="relative shrink-0">
                      {currentUserProfile?.avatarUrl ? (
                        <img 
                          src={currentUserProfile.avatarUrl} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/30 group-hover:ring-purple-500 shadow-sm"
                        />
                      ) : currentUserProfile?.avatarEmoji ? (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ring-2 ring-purple-500/20 group-hover:ring-purple-500 transition-all"
                          style={{ backgroundColor: currentUserProfile?.avatarColor || '#6366f1' }}
                        >
                          {currentUserProfile.avatarEmoji}
                        </div>
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg shadow-sm ring-2 ring-purple-500/20 group-hover:ring-purple-500 transition-all"
                          style={{ backgroundColor: currentUserProfile?.avatarColor || '#6366f1' }}
                        >
                          {formatDisplayName(currentUserProfile?.name || displayUser.name).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Edit2 className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                        Olá,
                      </span>
                      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-2">
                        <span>{formatDisplayName(currentUserProfile?.name || displayUser.name)}!</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsInviteModalOpen(true);
                          }}
                          className="p-1 rounded-lg bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-all flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/60"
                          title="Usuários Vinculados & Modo Família"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </span>
                      </h1>
                    </div>
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-black tracking-tight">
                    {activeTab === 'transactions' ? 'Extrato' :
                     activeTab === 'cashflow' ? 'Resumo' :
                     activeTab === 'validation' ? 'Recorrentes' :
                     activeTab === 'parcelados' ? 'Parcelamentos' :
                     activeTab === 'visuals' ? 'Gráficos' :
                     activeTab === 'goals' ? 'Metas' :
                     activeTab === 'settings' ? 'Configurações' :
                     activeTab === 'admin' ? 'Painel Admin' :
                     activeTab === 'ai' ? 'Consultoria IA' : 'Financeiro'}
                  </h1>
                  <p className="text-slate-400 font-medium">Gerencie suas contas e transações em um só lugar.</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs">
                <span className="text-[10px] uppercase font-black text-slate-400">Plano</span>
                <span className="text-indigo-600 dark:text-indigo-400 uppercase font-black text-xs">
                  {currentUserProfile?.isTrial 
                    ? `👑 Teste Premium (${currentUserProfile.trialDaysRemaining ?? 7}d)`
                    : (currentUserProfile?.tier || 'gratis')}
                </span>
                {!isPremiumOrAdmin && (
                  <button 
                    type="button"
                    onClick={() => setIsSubscriptionOpen(true)}
                    className="ml-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1"
                    title="Clique para ver planos e fazer upgrade"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                <button 
                  onClick={() => setActiveTab(activeTab === 'settings' ? 'dashboard' : 'settings')} 
                  className={`p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                    activeTab === 'settings'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                  title={activeTab === 'settings' ? "Início" : "Configurações"}
                >
                  {activeTab === 'settings' ? <Home className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Global Trial Status Banner */}
        {currentUserProfile?.isTrial && (
          <div className="mb-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 md:p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl border border-purple-800/50 print:hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-400/20 text-amber-300 rounded-2xl flex items-center justify-center shrink-0 border border-amber-400/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md uppercase tracking-wider">7 Dias de Teste Grátis</span>
                  <span className="text-xs text-purple-200 font-extrabold">Plano Premium Libero</span>
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  Restam <strong className="text-amber-300 font-black">{currentUserProfile.trialDaysRemaining ?? 7} dias</strong> do seu período de teste. Aproveite todas as ferramentas de IA e robô de voz.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsSubscriptionOpen(true)}
              className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Garantir Plano Definitivo</span>
            </button>
          </div>
        )}

        {!currentUserProfile?.isTrial && !currentUserProfile?.isPaid && currentUserProfile?.tier === 'gratis' && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 md:p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 text-amber-900 dark:text-amber-200 shadow-sm print:hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 font-black">
                ⌛
              </div>
              <div>
                <h4 className="text-sm font-black">Seu teste Premium de 7 dias expirou!</h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Seu usuário foi ajustado para o Plano Grátis. Escolha um dos planos para liberar o Consultor IA, robô A2 e recursos em grupo.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsSubscriptionOpen(true)}
              className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center"
            >
              Assinar um Plano
            </button>
          </div>
        )}

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
            allRawTransactions={filteredRawTransactions}
            goals={filteredGoals}
            installmentGroups={filteredInstallmentGroups}
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
          isTabLocked('validation') ? (
            <LockedFeatureCard featureName="Recorrentes" onUpgrade={() => setIsSubscriptionOpen(true)} />
          ) : (
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
              onAddRecurring={(rec) => {
                if (recurringTransactions.length >= (currentPlanLimits.recurringCount ?? Infinity)) {
                  showToast(`Limite de ${currentPlanLimits.recurringCount} recorrentes atingido no plano.`, 'info');
                  setIsSubscriptionOpen(true);
                  return;
                }
                addRecurring(rec);
              }}
              currentUserProfile={currentUserProfile}
              currentDate={new Date()} // Could be state for month navigation
              categories={categories}
              accounts={accounts}
            />
          )
        )}

        {activeTab === 'parcelados' && (
          isTabLocked('parcelados') ? (
            <LockedFeatureCard featureName="Compras Parceladas" onUpgrade={() => setIsSubscriptionOpen(true)} />
          ) : (
            <InstallmentsView 
              installmentGroups={filteredInstallmentGroups}
              transactions={filteredRawTransactions} // Pass filtered transactions to show templates for current user/couple
              onAdd={async (g, customItems) => {
                  if (installmentGroups.length >= (currentPlanLimits.installmentsCount ?? Infinity)) {
                    showToast(`Limite de ${currentPlanLimits.installmentsCount} parcelamentos atingido no plano.`, 'info');
                    setIsSubscriptionOpen(true);
                    return;
                  }
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
              onUpdateGroup={async (group) => {
                await updateInstallmentGroup(group);
                showToast('Contrato de parcelamento atualizado!');
              }}
              onUpdateSingle={async (item) => {
                await updateSingleInstallment(item);
                showToast('Parcela atualizada!');
              }}
              accounts={accounts}
              categories={categories}
            />
          )
        )}

        {activeTab === 'visuals' && (
          isTabLocked('visuals') ? (
            <LockedFeatureCard featureName="Gráficos e Analíticos" onUpgrade={() => setIsSubscriptionOpen(true)} />
          ) : (
            <Visuals 
              transactions={filteredTransactions} 
              categories={categories} 
              users={usersList} 
              accounts={accounts}
              recurringTransactions={recurringTransactions}
              installmentGroups={installmentGroups}
            />
          )
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
            onOpenManualForm={() => setIsFormOpen(true)}
            onEdit={(t) => {
                setEditingTransaction(t);
                setIsFormOpen(true);
            }}
          />
        )}

        {activeTab === 'goals' && (
          isTabLocked('goals') ? (
            <LockedFeatureCard featureName="Metas e Objetivos" onUpgrade={() => setIsSubscriptionOpen(true)} />
          ) : (
            <GoalsTrack 
              goals={goals} 
              onAddGoal={(goal) => {
                if (goals.length >= (currentPlanLimits.goals ?? Infinity)) {
                  showToast(`Limite de ${currentPlanLimits.goals} metas atingido no plano.`, 'info');
                  setIsSubscriptionOpen(true);
                  return;
                }
                addGoal(goal);
              }}
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
          )
        )}

        {activeTab === 'ai' && (
          isTabLocked('ai') ? (
            <LockedFeatureCard featureName="Consultor IA (A2Bot)" onUpgrade={() => setIsSubscriptionOpen(true)} />
          ) : (
            <AIConsultant 
              transactions={filteredTransactions} 
              accounts={accounts}
              categories={categories}
              currentUser={displayUser} 
              onAddTransaction={addTransaction}
              autoStartVoice={shouldAutoStartVoice}
              onVoiceHandled={() => setShouldAutoStartVoice(false)}
            />
          )
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around z-50 safe-area-bottom shadow-lg">
        {(() => {
          const mobileItems = [
            { id: 'dashboard', icon: Home, label: 'Início', color: 'text-indigo-600 dark:text-indigo-400' },
            { id: 'transactions', icon: History, label: 'Extrato', color: 'text-emerald-600 dark:text-emerald-400' },
            { id: 'cashflow', icon: TrendingUp, label: 'Resumo', color: 'text-violet-600 dark:text-violet-400' },
            { id: 'validation', icon: CalendarCheck, label: 'Recorrentes', color: 'text-amber-600 dark:text-amber-400' },
            { id: 'parcelados', icon: CreditCard, label: 'Parcelados', color: 'text-rose-600 dark:text-rose-400' },
            { id: 'visuals', icon: TrendingUp, label: 'Gráficos', color: 'text-sky-600 dark:text-sky-400' },
            { id: 'goals', icon: Target, label: 'Metas', color: 'text-teal-600 dark:text-teal-400' },
          ];

          if (currentUserProfile?.role === 'admin') {
            mobileItems.push({ id: 'admin', icon: ShieldCheck, label: 'Admin', color: 'text-red-600 dark:text-red-400' });
          }

          return mobileItems.map(item => {
            const isActive = activeTab === item.id;
            const locked = isTabLocked(item.id);
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all rounded-xl py-1 px-0.5 flex-1 min-w-0 max-w-[64px] ${
                  isActive 
                    ? 'bg-blue-100/90 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200 font-black' 
                    : 'text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-4 h-4 ${item.color} ${isActive ? 'scale-110' : 'opacity-85'} transition-transform`} />
                  {locked && (
                    <Lock className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-2" />
                  )}
                </div>
                <span className="text-[8.5px] sm:text-[9px] truncate w-full text-center leading-tight">{item.label}</span>
              </button>
            );
          });
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

      {isScannerOpen && !localMode && (
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
          reminders={activeReminders}
        />
      )}

      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          userProfile={currentUserProfile}
          onSave={(updates) => {
            updateUserProfile(updates);
            showToast('Perfil atualizado com sucesso!');
          }}
          onLogout={() => {
            setIsEditProfileOpen(false);
            signOut();
            navigate('/');
          }}
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
