import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { 
  Users, ShieldCheck, DollarSign, Award, ArrowUpRight, Search, 
  Filter, Check, RefreshCw, Clipboard, Database, AlertCircle, TrendingUp,
  Settings, Key, Globe, Eye, EyeOff, Save, Receipt, QrCode, CreditCard, Clock,
  Plus, Trash2, Calendar, Percent, FileText, ToggleLeft, ToggleRight, Ticket,
  Cpu, CheckSquare, ListPlus, X, Phone, MapPin, CheckCircle2, UserCheck,
  Mail, MessageSquare, Inbox, Unlock, Sparkles, Zap, ShieldAlert, Play, Lock
} from 'lucide-react';
import { 
  getPricingConfig, savePricingConfig, 
  getPromoConfig, savePromoConfig, 
  getCouponsConfig, saveCouponsConfig, 
  getAsaasConfig, saveAsaasConfig, 
  getAsaasTransactions, saveAsaasTransactions, clearAsaasTransactions, addAsaasTransaction,
  getSiteConfig, saveSiteConfig, getSiteSuggestions, fetchSiteConfigAsync, fetchSiteSuggestionsAsync, deleteSiteSuggestion,
  PricingPlan, PromoPackage, DiscountCoupon, AsaasConfig, AsaasTransactionLog, SiteConfig, UserSuggestion
} from '../services/adminSettings';
import { getTermsText, saveTermsText, DEFAULT_TERMS_TEXT } from '../services/termsService';

interface AdminPanelProps {
  currentUser: User;
}

interface DBProfile {
  id: string;
  name: string | null;
  full_name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  address?: string | null;
  terms_accepted?: boolean | null;
  terms_accepted_at?: string | null;
  avatar_color: string | null;
  pin: string | null;
  tier: string | null;
  role: string | null;
  email: string | null;
  created_at: string | null;
  couple_id: string | null;
  is_trial?: boolean | null;
  is_paid?: boolean | null;
  trial_ends_at?: string | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<DBProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [copiedSQL, setCopiedSQL] = useState(false);

  // Manual release modal states
  const [releaseModalUser, setReleaseModalUser] = useState<DBProfile | null>(null);
  const [manualReleaseSuccessMsg, setManualReleaseSuccessMsg] = useState<string | null>(null);
  const [customTierSelect, setCustomTierSelect] = useState<'basico' | 'medio' | 'premium'>('premium');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'usuarios' | 'termos' | 'financeiro' | 'precificacao' | 'midia'>('usuarios');

  // Terms of use editor state
  const [termsContent, setTermsContent] = useState(getTermsText());
  const [termsSaveSuccess, setTermsSaveSuccess] = useState(false);

  // Site Links & Media Config State
  const [siteConfig, setSiteConfigState] = useState<SiteConfig>(getSiteConfig());
  const [siteConfigSaved, setSiteConfigSaved] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<UserSuggestion[]>([]);

  // Detail Modal State
  const [selectedUserProfile, setSelectedUserProfile] = useState<DBProfile | null>(null);


  // Asaas Configuration state
  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig>({
    apiKey: '',
    environment: 'sandbox',
    webhookToken: '',
    webhookUrl: '',
    methods: { pix: true, boleto: true, creditCard: true },
    connected: false
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveAsaasSuccess, setSaveAsaasSuccess] = useState(false);

  // Transactions logs state
  const [transactions, setTransactions] = useState<AsaasTransactionLog[]>([]);

  // Pricing plans state
  const [pricingConfig, setPricingConfig] = useState<Record<string, PricingPlan>>({});
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState<string>('basico');
  const [editingPlanName, setEditingPlanName] = useState('');
  const [editingPlanPrice, setEditingPlanPrice] = useState(0);
  const [editingPlanDesc, setEditingPlanDesc] = useState('');
  const [editingPlanFeatures, setEditingPlanFeatures] = useState<string[]>([]);
  const [editingPlanEnabled, setEditingPlanEnabled] = useState(true);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [savePricingSuccess, setSavePricingSuccess] = useState(false);

  // Financial Dashboard Month Filter
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Limits / Toggles for currently edited plan
  const [editingLimits, setEditingLimits] = useState<PricingPlan['limits']>({
    accounts: 3,
    transactions: 50,
    goals: 3,
    hasVoice: true,
    hasCouple: false,
    hasImport: false,
    hasRecurring: false,
    hasReceiptPhoto: false
  });

  // Coupons state
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(0);
  const [newCouponExpiry, setNewCouponExpiry] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  // Promos state
  const [promos, setPromos] = useState<PromoPackage[]>([]);

  const fetchAllProfiles = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Load local registered users backup
      let localUsers: any[] = [];
      try {
        localUsers = JSON.parse(localStorage.getItem('saldo_a2_all_registered_users') || '[]');
      } catch (e) {
        console.warn('Error loading local registered users:', e);
      }

      let merged: DBProfile[] = [];

      if (data && data.length > 0) {
        merged = data.map((p: any) => {
          const local = localUsers.find((l: any) => l.id === p.id || l.email === p.email);
          const localPaid = localStorage.getItem(`user_paid_${p.id}`) === 'true';
          return {
            ...p,
            full_name: p.full_name || local?.full_name || local?.name || p.name,
            cpf: p.cpf || local?.cpf || null,
            phone: p.phone || local?.phone || null,
            address: p.address || local?.address || null,
            terms_accepted: p.terms_accepted !== undefined ? p.terms_accepted : (local?.terms_accepted ?? true),
            terms_accepted_at: p.terms_accepted_at || local?.terms_accepted_at || p.created_at,
            is_paid: p.is_paid !== undefined ? p.is_paid : (localPaid || local?.is_paid),
            is_trial: p.is_trial !== undefined ? p.is_trial : local?.is_trial,
            trial_ends_at: p.trial_ends_at || local?.trial_ends_at,
          };
        });
      }

      // Append local users not in DB response
      localUsers.forEach((l: any) => {
        if (!merged.some(m => m.id === l.id || m.email === l.email)) {
          merged.push({
            id: l.id || `local-${Date.now()}`,
            name: l.name || l.full_name || 'Usuário',
            full_name: l.full_name || l.name,
            cpf: l.cpf || null,
            phone: l.phone || null,
            address: l.address || null,
            terms_accepted: l.terms_accepted ?? true,
            terms_accepted_at: l.terms_accepted_at || new Date().toISOString(),
            avatar_color: '#6366f1',
            pin: null,
            tier: l.tier || 'gratis',
            role: 'user',
            email: l.email || null,
            created_at: l.created_at || new Date().toISOString(),
            couple_id: null,
            is_trial: l.is_trial,
            is_paid: l.is_paid || localStorage.getItem(`user_paid_${l.id}`) === 'true',
            trial_ends_at: l.trial_ends_at,
          });
        }
      });

      setProfiles(merged);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      // Fallback to local users list if RLS limits
      let localUsers: any[] = [];
      try {
        localUsers = JSON.parse(localStorage.getItem('saldo_a2_all_registered_users') || '[]');
      } catch (e) {}

      if (localUsers.length > 0) {
        setProfiles(localUsers.map((l: any) => ({
          id: l.id,
          name: l.name || l.full_name,
          full_name: l.full_name || l.name,
          cpf: l.cpf || null,
          phone: l.phone || null,
          address: l.address || null,
          terms_accepted: l.terms_accepted ?? true,
          terms_accepted_at: l.terms_accepted_at || new Date().toISOString(),
          avatar_color: '#6366f1',
          pin: null,
          tier: l.tier || 'gratis',
          role: 'user',
          email: l.email || null,
          created_at: l.created_at || new Date().toISOString(),
          couple_id: null,
          is_trial: l.is_trial,
          is_paid: l.is_paid || localStorage.getItem(`user_paid_${l.id}`) === 'true',
          trial_ends_at: l.trial_ends_at,
        })));
      } else {
        setErrorState(err.message || 'Row Level Security (RLS) limitou a busca.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProfiles();

    // Load configs from adminSettings
    setAsaasConfig(getAsaasConfig());
    setTransactions(getAsaasTransactions());
    const pricing = getPricingConfig();
    setPricingConfig(pricing);
    setCoupons(getCouponsConfig());
    setPromos(getPromoConfig());
    setSuggestionsList(getSiteSuggestions());

    fetchSiteConfigAsync().then((cfg) => setSiteConfigState(cfg));
    fetchSiteSuggestionsAsync().then((sugs) => setSuggestionsList(sugs));

    // Initialize editing states for selected plan
    const initialPlan = pricing['basico'] || pricing['gratis'];
    if (initialPlan) {
      setEditingPlanName(initialPlan.name);
      setEditingPlanPrice(initialPlan.price);
      setEditingPlanDesc(initialPlan.description);
      setEditingPlanFeatures(initialPlan.features);
      setEditingPlanEnabled(initialPlan.enabled !== false);
      setEditingLimits(initialPlan.limits);
    }
  }, []);

  const handleSelectPlanToEdit = (planKey: string) => {
    setSelectedPlanToEdit(planKey);
    const plan = pricingConfig[planKey];
    if (plan) {
      setEditingPlanName(plan.name);
      setEditingPlanPrice(plan.price);
      setEditingPlanDesc(plan.description);
      setEditingPlanFeatures(plan.features || []);
      setEditingPlanEnabled(plan.enabled !== false);
      setEditingLimits({
        accounts: 1,
        transactions: 15,
        goals: 1,
        recurringCount: 5,
        installmentsCount: 5,
        hasVoice: false,
        hasCouple: false,
        hasImport: false,
        hasRecurring: true,
        hasInstallments: true,
        hasCharts: true,
        hasGoalsTab: true,
        hasAiConsultant: false,
        hasReceiptPhoto: false,
        ...plan.limits
      });
    }
  };

  const handleUpdateUserTier = async (userId: string, newTier: 'gratis' | 'basico' | 'medio' | 'premium') => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tier: newTier })
        .eq('id', userId);

      if (error) throw error;

      // Update locally
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, tier: newTier } : p));
    } catch (err) {
      console.error('Error updating tier:', err);
      alert('Erro ao atualizar nível de acesso. Verifique as permissões de RLS no console do Supabase.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update locally
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Erro ao atualizar cargo.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleManualRelease = async (
    userId: string, 
    actionType: 'premium_vitalicio' | 'renovar_7' | 'renovar_30' | 'plano_especifico' | 'gratis',
    customTierChoice?: 'basico' | 'medio' | 'premium'
  ) => {
    setUpdatingUserId(userId);
    try {
      const now = new Date();
      let updates: any = {};

      if (actionType === 'premium_vitalicio') {
        updates = {
          tier: 'premium',
          is_paid: true,
          is_trial: false,
        };
        localStorage.setItem(`user_paid_${userId}`, 'true');
      } else if (actionType === 'renovar_7') {
        const newTrialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        updates = {
          tier: 'premium',
          is_paid: false,
          is_trial: true,
          trial_ends_at: newTrialEnds,
        };
        localStorage.removeItem(`user_paid_${userId}`);
      } else if (actionType === 'renovar_30') {
        const newTrialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        updates = {
          tier: 'premium',
          is_paid: false,
          is_trial: true,
          trial_ends_at: newTrialEnds,
        };
        localStorage.removeItem(`user_paid_${userId}`);
      } else if (actionType === 'plano_especifico') {
        const sel = customTierChoice || 'premium';
        updates = {
          tier: sel,
          is_paid: true,
          is_trial: false,
        };
        localStorage.setItem(`user_paid_${userId}`, 'true');
      } else if (actionType === 'gratis') {
        updates = {
          tier: 'gratis',
          is_paid: false,
          is_trial: false,
        };
        localStorage.removeItem(`user_paid_${userId}`);
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.warn('Supabase update warning, updating local profile state:', error);
      }

      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p));

      // Update local storage backup
      try {
        const localUsers = JSON.parse(localStorage.getItem('saldo_a2_all_registered_users') || '[]');
        const updatedLocal = localUsers.map((u: any) => u.id === userId ? { ...u, ...updates } : u);
        localStorage.setItem('saldo_a2_all_registered_users', JSON.stringify(updatedLocal));
      } catch (e) {}

      setManualReleaseSuccessMsg('Acesso do usuário liberado com sucesso!');
      setTimeout(() => setManualReleaseSuccessMsg(null), 3500);
      setReleaseModalUser(null);
    } catch (err: any) {
      console.error('Error in handleManualRelease:', err);
      alert('Erro ao processar liberação manual.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Projections & stats: ADMs strictly excluded from paid plans, counters and revenue!
  const stats = React.useMemo(() => {
    const now = new Date();
    const nonAdmins = profiles.filter(p => p.role !== 'admin');
    const total = profiles.length;
    const nonAdminCount = nonAdmins.length;
    const adminCount = profiles.filter(p => p.role === 'admin').length;

    let trialActiveCount = 0;
    let trialExpiredCount = 0;
    let manualReleasedCount = 0;

    nonAdmins.forEach(p => {
      const isPaid = p.is_paid === true || localStorage.getItem(`user_paid_${p.id}`) === 'true';
      if (isPaid) {
        manualReleasedCount++;
      } else {
        const createdAtIso = p.created_at || new Date().toISOString();
        let trialEndsAtIso = p.trial_ends_at;
        if (!trialEndsAtIso) {
          trialEndsAtIso = new Date(new Date(createdAtIso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        }
        if (now > new Date(trialEndsAtIso)) {
          trialExpiredCount++;
        } else {
          trialActiveCount++;
        }
      }
    });

    const gratis = nonAdmins.filter(p => !p.tier || p.tier === 'gratis').length;
    const basico = nonAdmins.filter(p => p.tier === 'basico').length;
    const medio = nonAdmins.filter(p => p.tier === 'medio').length;
    const premium = nonAdmins.filter(p => p.tier === 'premium').length;

    // Load active dynamic prices
    const priceBasico = pricingConfig.basico?.price ?? 19.90;
    const priceMedio = pricingConfig.medio?.price ?? 39.90;
    const pricePremium = pricingConfig.premium?.price ?? 59.90;

    // Projected monthly revenue
    const projectedRevenue = (basico * priceBasico) + (medio * priceMedio) + (premium * pricePremium);

    return {
      total,
      nonAdminCount,
      adminCount,
      trialActiveCount,
      trialExpiredCount,
      manualReleasedCount,
      gratis,
      basico,
      medio,
      premium,
      projectedRevenue
    };
  }, [profiles, pricingConfig]);

  // Comprehensive Financial Metrics & Dashboard Data
  const financialMetrics = React.useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const formattedCurrentMonthLabel = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);
    
    // Group transactions by month YYYY-MM
    const monthGroups: Record<string, {
      monthKey: string;
      label: string;
      totalCount: number;
      approvedAmount: number;
      pendingAmount: number;
      overdueAmount: number;
      totalAmount: number;
      pixCount: number;
      cardCount: number;
      boletoCount: number;
      txs: AsaasTransactionLog[];
    }> = {};

    let grandTotalApproved = 0;
    let grandTotalPending = 0;
    let currentMonthApproved = 0;
    let currentMonthPending = 0;
    let currentMonthCount = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const mKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      const monthName = txDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const formattedLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      if (!monthGroups[mKey]) {
        monthGroups[mKey] = {
          monthKey: mKey,
          label: formattedLabel,
          totalCount: 0,
          approvedAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          totalAmount: 0,
          pixCount: 0,
          cardCount: 0,
          boletoCount: 0,
          txs: []
        };
      }

      const grp = monthGroups[mKey];
      grp.totalCount += 1;
      grp.totalAmount += tx.amount;
      grp.txs.push(tx);

      if (tx.paymentMethod === 'pix') grp.pixCount += 1;
      if (tx.paymentMethod === 'credit_card') grp.cardCount += 1;
      if (tx.paymentMethod === 'boleto') grp.boletoCount += 1;

      if (tx.status === 'CONFIRMED' || tx.status === 'RECEIVED') {
        grp.approvedAmount += tx.amount;
        grandTotalApproved += tx.amount;
        if (mKey === currentMonthKey) {
          currentMonthApproved += tx.amount;
          currentMonthCount += 1;
        }
      } else if (tx.status === 'PENDING') {
        grp.pendingAmount += tx.amount;
        grandTotalPending += tx.amount;
        if (mKey === currentMonthKey) {
          currentMonthPending += tx.amount;
        }
      } else if (tx.status === 'OVERDUE') {
        grp.overdueAmount += tx.amount;
      }
    });

    const sortedMonths = Object.values(monthGroups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // Users per plan breakdown
    const nonAdmins = profiles.filter(p => p.role !== 'admin');
    const totalUsers = nonAdmins.length || 1;

    const usersByPlan = {
      gratis: nonAdmins.filter(p => !p.tier || p.tier === 'gratis'),
      basico: nonAdmins.filter(p => p.tier === 'basico'),
      medio: nonAdmins.filter(p => p.tier === 'medio'),
      premium: nonAdmins.filter(p => p.tier === 'premium'),
      admin: profiles.filter(p => p.role === 'admin'),
      trial: nonAdmins.filter(p => (p as any).isTrial),
    };

    const priceBasico = pricingConfig.basico?.price ?? 19.90;
    const priceMedio = pricingConfig.medio?.price ?? 39.90;
    const pricePremium = pricingConfig.premium?.price ?? 59.90;

    const mrrBasico = usersByPlan.basico.length * priceBasico;
    const mrrMedio = usersByPlan.medio.length * priceMedio;
    const mrrPremium = usersByPlan.premium.length * pricePremium;
    const mrrTotal = mrrBasico + mrrMedio + mrrPremium;
    const arrTotal = mrrTotal * 12;

    const projection3m = mrrTotal * 3;
    const projection6m = mrrTotal * 6;
    const projection12m = mrrTotal * 12;

    return {
      currentMonthKey,
      formattedCurrentMonthLabel,
      currentMonthApproved,
      currentMonthPending,
      currentMonthCount,
      grandTotalApproved,
      grandTotalPending,
      sortedMonths,
      usersByPlan,
      totalUsers,
      mrrBasico,
      mrrMedio,
      mrrPremium,
      mrrTotal,
      arrTotal,
      projection3m,
      projection6m,
      projection12m
    };
  }, [transactions, profiles, pricingConfig]);

  // Filtered profiles for Users tab
  const filteredProfiles = React.useMemo(() => {
    const now = new Date();
    return profiles.filter(p => {
      const name = p.name || p.full_name || '';
      const email = p.email || '';
      const cpf = p.cpf || '';
      const tier = p.tier || 'gratis';
      const isOwner = p.email === 'fabianofreitasfoto@hotmail.com';
      const isPaid = p.is_paid === true || localStorage.getItem(`user_paid_${p.id}`) === 'true';

      const createdAtIso = p.created_at || new Date().toISOString();
      let trialEndsAtIso = p.trial_ends_at;
      if (!trialEndsAtIso) {
        trialEndsAtIso = new Date(new Date(createdAtIso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      const trialEndsDate = new Date(trialEndsAtIso);
      const isTrialExpired = !isOwner && !isPaid && now > trialEndsDate;
      const isTrialActive = !isOwner && !isPaid && now <= trialEndsDate;

      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            cpf.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (tierFilter === 'trial_expired') {
        matchesFilter = isTrialExpired;
      } else if (tierFilter === 'trial_active') {
        matchesFilter = isTrialActive;
      } else if (tierFilter === 'manual_released') {
        matchesFilter = isPaid;
      } else if (tierFilter !== 'all') {
        matchesFilter = tier === tierFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }, [profiles, searchTerm, tierFilter]);

  const copySQLCommand = () => {
    const sql = `-- Execute este comando no editor SQL do Supabase para atualizar a estrutura de usuários e permissões do Admin:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'gratis';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TEXT;

-- Criação da função de verificação segura para Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

UPDATE public.profiles SET role = 'admin', tier = 'premium' WHERE id = '${currentUser.id}';`;
    navigator.clipboard.writeText(sql);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  // Save Asaas gate configs
  const handleSaveAsaas = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...asaasConfig,
      connected: asaasConfig.apiKey.trim().length > 0
    };
    saveAsaasConfig(updated);
    setAsaasConfig(updated);
    setSaveAsaasSuccess(true);
    setTimeout(() => setSaveAsaasSuccess(false), 3000);
  };

  // Save Plan configs
  const handleSavePlan = () => {
    if (!selectedPlanToEdit) return;
    const updatedPlan: PricingPlan = {
      name: editingPlanName,
      price: Number(editingPlanPrice),
      description: editingPlanDesc,
      features: editingPlanFeatures,
      enabled: editingPlanEnabled,
      limits: editingLimits
    };
    const updatedConfig = {
      ...pricingConfig,
      [selectedPlanToEdit]: updatedPlan
    };
    savePricingConfig(updatedConfig);
    setPricingConfig(updatedConfig);
    setSavePricingSuccess(true);
    setTimeout(() => setSavePricingSuccess(false), 3000);
  };

  const handleSimulateTransaction = () => {
    const plansKeys = ['basico', 'medio', 'premium'];
    const randomPlan = plansKeys[Math.floor(Math.random() * plansKeys.length)];
    const price = pricingConfig[randomPlan]?.price || 19.90;
    const methods: ('pix' | 'credit_card' | 'boleto')[] = ['pix', 'credit_card', 'boleto'];
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    
    const names = ['Carlos Eduardo', 'Ana Paula', 'Rodrigo Alves', 'Juliana Lima', 'Fernanda Souza', 'Bruno Castro', 'Patricia Mendes'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomEmail = `${randomName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

    addAsaasTransaction({
      customerName: randomName,
      customerEmail: randomEmail,
      plan: randomPlan,
      amount: price,
      paymentMethod: randomMethod,
      status: 'CONFIRMED'
    });

    setTransactions(getAsaasTransactions());
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setEditingPlanFeatures([...editingPlanFeatures, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx: number) => {
    setEditingPlanFeatures(editingPlanFeatures.filter((_, i) => i !== idx));
  };

  // Promo toggle
  const handleTogglePromo = (promoId: 'annual' | 'semiannual') => {
    const updated = promos.map(p => p.id === promoId ? { ...p, active: !p.active } : p);
    setPromos(updated);
    savePromoConfig(updated);
  };

  const handleUpdatePromoDiscount = (promoId: 'annual' | 'semiannual', val: number) => {
    const updated = promos.map(p => p.id === promoId ? { ...p, discountPercentage: val } : p);
    setPromos(updated);
    savePromoConfig(updated);
  };

  // Create coupon
  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || newCouponValue <= 0 || !newCouponExpiry) return;
    const newCoupon: DiscountCoupon = {
      code: newCouponCode.trim().toUpperCase(),
      type: newCouponType,
      value: Number(newCouponValue),
      expirationDate: newCouponExpiry,
      active: true
    };
    const updated = [...coupons, newCoupon];
    setCoupons(updated);
    saveCouponsConfig(updated);
    setNewCouponCode('');
    setNewCouponValue(0);
    setNewCouponExpiry('');
    setCouponSuccessMsg('Cupom criado com sucesso!');
    setTimeout(() => setCouponSuccessMsg(''), 3000);
  };

  const handleDeleteCoupon = (code: string) => {
    const updated = coupons.filter(c => c.code !== code);
    setCoupons(updated);
    saveCouponsConfig(updated);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            Acesso Restrito ao Administrador
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-1">Painel de Controle Admin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gerencie os acessos, libere testes, precificação comercial e controle suas chaves Asaas de recebimento.</p>
        </div>
        <button 
          onClick={fetchAllProfiles}
          className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs px-4 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Sincronizar Banco
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Clientes</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{loading ? '...' : stats.nonAdminCount}</h3>
            <span className="text-[9px] text-slate-400 font-medium">({stats.adminCount} Admins isentos)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teste 7d Ativo</span>
            <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-tight">{loading ? '...' : stats.trialActiveCount}</h3>
            <span className="text-[9px] text-slate-400 font-medium">Degustação Premium</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Testes Expirados</span>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-tight">{loading ? '...' : stats.trialExpiredCount}</h3>
            <span className="text-[9px] text-slate-400 font-medium">Pendente Liberação Manual</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Liberados / Pagos</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {loading ? '...' : stats.manualReleasedCount}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium">Manual ou via Asaas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MRR Projetado</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {loading ? '...' : `R$ ${stats.projectedRevenue.toFixed(2).replace('.', ',')}`}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium">Sem impostos gateway</span>
          </div>
        </div>
      </div>

      {/* RLS Policy Checker */}
      {errorState && (
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-sm uppercase tracking-wide">
              <Database className="w-5 h-5" />
              Sincronização Necessária com Supabase
            </div>
            <h3 className="text-xl md:text-2xl font-black">Ajuste seu Banco de Dados no Supabase</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Para você poder visualizar e gerenciar o plano dos outros usuários através desse painel, é preciso atualizar a tabela de perfis adicionando as colunas de plano (<code className="text-indigo-400">tier</code>, <code className="text-indigo-400">role</code>, <code className="text-indigo-400">email</code>) e liberando a regra Row Level Security (RLS) para Administradores.
            </p>
            <div className="text-[11px] bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-400 flex items-start gap-2 max-h-48 overflow-y-auto font-mono">
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Instrução:</strong> Abra o console do seu <strong>Supabase</strong>, vá na seção <strong>SQL Editor</strong>, crie uma nova query, cole o script que foi gerado no arquivo <code className="text-indigo-400">supabase-add-subscriptions.sql</code> na raiz do seu projeto e execute-o. Depois, clique em "Sincronizar Banco" acima!
              </span>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-3 justify-center items-stretch bg-slate-950 p-6 rounded-3xl border border-slate-800">
            <button 
              onClick={copySQLCommand}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {copiedSQL ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
              {copiedSQL ? 'Copiado para o Clipboard!' : 'Copiar Comando SQL'}
            </button>
            <button 
              onClick={fetchAllProfiles}
              className="w-full py-3 px-4 bg-transparent border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl max-w-2xl gap-1 border border-slate-200/40 dark:border-slate-800/20">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'usuarios'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('termos')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'termos'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Termos de Uso
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'financeiro'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financeiro (Asaas)
        </button>
        <button
          onClick={() => setActiveTab('precificacao')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'precificacao'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          Precificação
        </button>
        <button
          onClick={() => setActiveTab('midia')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'midia'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          Redes & Mídias
        </button>
      </div>

      {/* Tab content area */}
      {!errorState && (
        <div className="space-y-6">
          
          {/* TAB 1: USUÁRIOS */}
          {activeTab === 'usuarios' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-fadeIn">
              {/* Controls Bar */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-xl">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome, CPF ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter */}
                  <div className="relative w-full md:w-64">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select 
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="all">Todos os Status / Planos</option>
                      <option value="trial_expired">⚠️ Teste 7d Expirado ({stats.trialExpiredCount})</option>
                      <option value="trial_active">👑 Teste 7d Ativo ({stats.trialActiveCount})</option>
                      <option value="manual_released">⚡ Liberados / Pagos ({stats.manualReleasedCount})</option>
                      <option value="gratis">Plano Grátis</option>
                      <option value="basico">Plano Básico</option>
                      <option value="medio">Plano Médio</option>
                      <option value="premium">Plano Premium</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  Mostrando <span className="text-indigo-600 dark:text-indigo-400">{filteredProfiles.length}</span> de {profiles.length} usuários
                </div>
              </div>

              {/* Expired Trials Alert Banner */}
              {stats.trialExpiredCount > 0 && (
                <div className="mx-5 my-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-3 text-xs">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-amber-900 dark:text-amber-200">
                        {stats.trialExpiredCount} usuário(s) com o teste de 7 dias expirado!
                      </strong>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Estes usuários passaram do período de 7 dias e foram rebaixados para Grátis. Você pode realizar a liberação manual para conceder acesso Premium.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTierFilter('trial_expired')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filtrar Testes Expirados
                  </button>
                </div>
              )}

              {/* Table */}
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
                  <p className="text-xs font-semibold">Carregando usuários cadastrados...</p>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mb-3 text-slate-300" />
                  <p className="text-xs font-semibold">Nenhum usuário corresponde aos filtros definidos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Usuário / Nome</th>
                        <th className="px-6 py-4">CPF / Celular</th>
                        <th className="px-6 py-4">Status do Teste / Acesso</th>
                        <th className="px-6 py-4">Aceite dos Termos</th>
                        <th className="px-6 py-4">Plano</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                      {filteredProfiles.map((p) => {
                        const isSelf = p.id === currentUser.id;
                        const tier = p.tier || 'gratis';
                        const role = p.role || 'user';
                        const displayName = p.full_name || p.name || 'Sem Nome';

                        const isOwner = p.email === 'fabianofreitasfoto@hotmail.com';
                        const isPaid = p.is_paid === true || localStorage.getItem(`user_paid_${p.id}`) === 'true';

                        const createdAtIso = p.created_at || new Date().toISOString();
                        let trialEndsAtIso = p.trial_ends_at;
                        if (!trialEndsAtIso) {
                          trialEndsAtIso = new Date(new Date(createdAtIso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
                        }
                        const now = new Date();
                        const trialEndsDate = new Date(trialEndsAtIso);
                        const isTrialActive = !isOwner && !isPaid && now <= trialEndsDate;
                        const isTrialExpired = !isOwner && !isPaid && now > trialEndsDate;
                        const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                        const termsDateStr = p.terms_accepted_at ? (() => {
                          try {
                            const d = new Date(p.terms_accepted_at);
                            return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                          } catch (e) {
                            return p.terms_accepted_at;
                          }
                        })() : null;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            {/* Avatar & Name */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0"
                                  style={{ backgroundColor: p.avatar_color || '#6366f1' }}
                                >
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    {displayName}
                                    {isSelf && (
                                      <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                                        Você
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{p.email || 'Sem e-mail'}</p>
                                </div>
                              </div>
                            </td>

                            {/* CPF & Phone */}
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                              <p className="font-bold text-slate-800 dark:text-slate-200">{p.cpf || <span className="text-slate-400 font-normal italic">Pendente</span>}</p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {p.phone || 'Sem celular'}
                              </p>
                            </td>

                            {/* Trial Status / Access */}
                            <td className="px-6 py-4">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                  <ShieldCheck className="w-3 h-3" /> Admin Isento
                                </span>
                              ) : isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <Zap className="w-3 h-3" /> Liberado Manual / Pago
                                </span>
                              ) : isTrialActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                  <Clock className="w-3 h-3" /> Teste 7d Ativo ({trialDaysRemaining}d res.)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <AlertCircle className="w-3 h-3" /> Teste Expirado (Grátis)
                                </span>
                              )}
                            </td>

                            {/* Terms Accepted */}
                            <td className="px-6 py-4">
                              {p.terms_accepted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {termsDateStr ? `Aceito (${termsDateStr})` : 'Aceito'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400">
                                  Pendente
                                </span>
                              )}
                            </td>

                            {/* Tier Badge */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-wide border ${
                                tier === 'premium'
                                  ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30'
                                  : tier === 'medio'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                                    : tier === 'basico'
                                      ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {tier}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => setReleaseModalUser(p)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                  title="Liberação Manual de Acesso"
                                >
                                  <Unlock className="w-3 h-3" />
                                  Liberar
                                </button>

                                <button
                                  onClick={() => setSelectedUserProfile(p)}
                                  className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] rounded-lg border border-indigo-200 dark:border-indigo-800/40 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Ficha
                                </button>

                                <select
                                  value={tier}
                                  disabled={updatingUserId === p.id}
                                  onChange={(e) => handleUpdateUserTier(p.id, e.target.value as any)}
                                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700 dark:text-slate-200 uppercase"
                                >
                                  <option value="gratis">Grátis</option>
                                  <option value="basico">Básico</option>
                                  <option value="medio">Médio</option>
                                  <option value="premium">Premium</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TERMOS DE USO EDITOR */}
          {activeTab === 'termos' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg">Termos de Uso e Política de Privacidade</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Edite o texto contratual exibido no cadastro e na página inicial do Saldo A2.
                    </p>
                  </div>
                </div>

                {termsSaveSuccess && (
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Termos de Uso salvos com sucesso!
                  </div>
                )}
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                saveTermsText(termsContent);
                setTermsSaveSuccess(true);
                setTimeout(() => setTermsSaveSuccess(false), 3500);
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Conteúdo Completo dos Termos (Texto Editável)
                  </label>
                  <textarea
                    rows={18}
                    value={termsContent}
                    onChange={(e) => setTermsContent(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja restaurar os Termos de Uso padrões originais do sistema?')) {
                        setTermsContent(DEFAULT_TERMS_TEXT);
                        saveTermsText(DEFAULT_TERMS_TEXT);
                        setTermsSaveSuccess(true);
                        setTimeout(() => setTermsSaveSuccess(false), 3500);
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Restaurar Padrão do Sistema
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações nos Termos
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: FINANCEIRO & DASHBOARD DE VENDAS */}
          {activeTab === 'financeiro' && (
            <div className="space-y-8 animate-fadeIn">

              {/* Header with Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                    <TrendingUp className="w-4 h-4" />
                    Métricas de Receita & Projeções
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black">Dashboard Financeiro Asaas</h3>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Acompanhe em tempo real a somatória do mês, faturamento acumulado, projeções de MRR/ARR, histórico mês a mês e a distribuição de usuários por plano.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleSimulateTransaction}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Simular Venda Asaas
                  </button>
                </div>
              </div>

              {/* KPI CARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Somatória do Mês Atual */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Somatória do Mês ({financialMetrics.formattedCurrentMonthLabel})
                    </span>
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white block">
                      R$ {financialMetrics.currentMonthApproved.toFixed(2).replace('.', ',')}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {financialMetrics.currentMonthCount} transações pagas neste mês
                    </p>
                  </div>
                  {financialMetrics.currentMonthPending > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <span>Pendente no Mês:</span>
                      <span>R$ {financialMetrics.currentMonthPending.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                </div>

                {/* 2. Faturamento Total Acumulado */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Faturamento Total
                    </span>
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white block">
                      R$ {financialMetrics.grandTotalApproved.toFixed(2).replace('.', ',')}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                      Total histórico de vendas aprovadas
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>Aguardando Pagamento:</span>
                    <span className="text-amber-600">R$ {financialMetrics.grandTotalPending.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* 3. MRR & ARR Estimado */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      MRR (Receita Mensal Recorrente)
                    </span>
                    <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white block">
                      R$ {financialMetrics.mrrTotal.toFixed(2).replace('.', ',')}
                    </span>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                      ARR Estimado: R$ {financialMetrics.arrTotal.toFixed(2).replace('.', ',')}/ano
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span>Base Ativa Pagante:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {financialMetrics.usersByPlan.basico.length + financialMetrics.usersByPlan.medio.length + financialMetrics.usersByPlan.premium.length} usuários
                    </span>
                  </div>
                </div>

                {/* 4. Base Total de Usuários */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Total Usuários Registrados
                    </span>
                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white block">
                      {financialMetrics.totalUsers}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {financialMetrics.usersByPlan.gratis.length} no plano Grátis
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-emerald-600">
                    <span>Taxa de Conversão Pago:</span>
                    <span>
                      {(((financialMetrics.usersByPlan.basico.length + financialMetrics.usersByPlan.medio.length + financialMetrics.usersByPlan.premium.length) / financialMetrics.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* PROJEÇÕES FINANCEIRAS & USUÁRIOS POR PLANO */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Projeção de Faturamento Card */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white">Projeções de Faturamento</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Estimativas baseadas no valor atual das assinaturas ativas.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Projeção 3 Meses */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wider">Acumulado em 3 Meses</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm">R$ {financialMetrics.projection3m.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>

                    {/* Projeção 6 Meses */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wider">Acumulado em 6 Meses</span>
                        <span className="text-purple-600 dark:text-purple-400 text-sm">R$ {financialMetrics.projection6m.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>

                    {/* Projeção 12 Meses (ARR) */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wider">Acumulado em 12 Meses (ARR)</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-sm">R$ {financialMetrics.projection12m.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantidade de Usuários por Plano */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-white">Usuários por Plano</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Distribuição quantitativa e receita mensal gerada por tier.</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full">
                      Total: {financialMetrics.totalUsers} Usuários
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Plano Grátis */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Plano Grátis</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          pricingConfig.gratis?.enabled !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pricingConfig.gratis?.enabled !== false ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                          {financialMetrics.usersByPlan.gratis.length}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {((financialMetrics.usersByPlan.gratis.length / financialMetrics.totalUsers) * 100).toFixed(1)}% da base
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">Receita: R$ 0,00/mês</p>
                    </div>

                    {/* Plano Básico */}
                    <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Plano Básico</span>
                        <span className="text-[10px] font-extrabold text-slate-500">
                          R$ {(pricingConfig.basico?.price ?? 19.90).toFixed(2).replace('.', ',')}/mês
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                          {financialMetrics.usersByPlan.basico.length}
                        </span>
                        <span className="text-xs font-bold text-indigo-600">
                          {((financialMetrics.usersByPlan.basico.length / financialMetrics.totalUsers) * 100).toFixed(1)}% da base
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-600 font-bold">
                        Receita: R$ {financialMetrics.mrrBasico.toFixed(2).replace('.', ',')}/mês
                      </p>
                    </div>

                    {/* Plano Médio */}
                    <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-950/50 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400">Plano Médio</span>
                        <span className="text-[10px] font-extrabold text-slate-500">
                          R$ {(pricingConfig.medio?.price ?? 39.90).toFixed(2).replace('.', ',')}/mês
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                          {financialMetrics.usersByPlan.medio.length}
                        </span>
                        <span className="text-xs font-bold text-purple-600">
                          {((financialMetrics.usersByPlan.medio.length / financialMetrics.totalUsers) * 100).toFixed(1)}% da base
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-600 font-bold">
                        Receita: R$ {financialMetrics.mrrMedio.toFixed(2).replace('.', ',')}/mês
                      </p>
                    </div>

                    {/* Plano Premium */}
                    <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-950/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Plano Premium</span>
                        <span className="text-[10px] font-extrabold text-slate-500">
                          R$ {(pricingConfig.premium?.price ?? 59.90).toFixed(2).replace('.', ',')}/mês
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                          {financialMetrics.usersByPlan.premium.length}
                        </span>
                        <span className="text-xs font-bold text-amber-600">
                          {((financialMetrics.usersByPlan.premium.length / financialMetrics.totalUsers) * 100).toFixed(1)}% da base
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-600 font-bold">
                        Receita: R$ {financialMetrics.mrrPremium.toFixed(2).replace('.', ',')}/mês
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* HISTÓRICO DE PAGAMENTOS MÊS A MÊS COM TOTAIS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white text-lg">Histórico de Pagamentos Mês a Mês</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Resumo consolidado por mês com totais de vendas aprovadas e pendentes.</p>
                    </div>
                  </div>

                  {/* Filter by Month */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">Todos os Meses</option>
                      {financialMetrics.sortedMonths.map(grp => (
                        <option key={grp.monthKey} value={grp.monthKey}>
                          {grp.label} ({grp.totalCount} vendas)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Monthly Totals Cards List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {financialMetrics.sortedMonths
                    .filter(grp => selectedMonthFilter === 'all' || selectedMonthFilter === grp.monthKey)
                    .map(mGrp => (
                      <div key={mGrp.monthKey} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 hover:border-indigo-300 transition-all">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                            {mGrp.label}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                            {mGrp.totalCount} transações
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Total Aprovado:</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              R$ {mGrp.approvedAmount.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          {mGrp.pendingAmount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-semibold">Aguardando Pagamento:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                R$ {mGrp.pendingAmount.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-slate-800 font-extrabold">
                            <span className="text-slate-700 dark:text-slate-300">Total do Mês:</span>
                            <span className="text-slate-900 dark:text-white">
                              R$ {mGrp.totalAmount.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>

                        {/* Payment Method distribution badges */}
                        <div className="flex items-center gap-2 pt-2 text-[9px] font-extrabold text-slate-400">
                          {mGrp.pixCount > 0 && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Pix: {mGrp.pixCount}</span>}
                          {mGrp.cardCount > 0 && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Cartão: {mGrp.cardCount}</span>}
                          {mGrp.boletoCount > 0 && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded">Boleto: {mGrp.boletoCount}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* INTEGRATION ASAAS GATEWAY & LOGS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Asaas Setup Panel */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-white">API Gateway Asaas</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Configuração das chaves de pagamentos Pix/Cartão.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveAsaas} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        Ambiente de Transação
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAsaasConfig({ ...asaasConfig, environment: 'sandbox' })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            asaasConfig.environment === 'sandbox'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                              : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          Homologação (Sandbox)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAsaasConfig({ ...asaasConfig, environment: 'production' })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            asaasConfig.environment === 'production'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                              : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          Produção (Real)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          Chave API Privada ($)
                        </label>
                        <button 
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[10px] font-bold text-indigo-500"
                        >
                          {showApiKey ? 'Ocultar' : 'Visualizar'}
                        </button>
                      </div>
                      <input 
                        type={showApiKey ? 'text' : 'password'}
                        value={asaasConfig.apiKey}
                        onChange={(e) => setAsaasConfig({ ...asaasConfig, apiKey: e.target.value })}
                        placeholder="$asaas_prod_secret_key_..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[9px] text-slate-400 leading-tight">Obtenha sua chave acessando o painel Asaas em Minha Conta {`->`} Integrações.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Formas de Recebimento Ativas</label>
                      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                          <input 
                            type="checkbox"
                            checked={asaasConfig.methods.pix}
                            onChange={(e) => setAsaasConfig({
                              ...asaasConfig,
                              methods: { ...asaasConfig.methods, pix: e.target.checked }
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          PIX Instantâneo
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                          <input 
                            type="checkbox"
                            checked={asaasConfig.methods.creditCard}
                            onChange={(e) => setAsaasConfig({
                              ...asaasConfig,
                              methods: { ...asaasConfig.methods, creditCard: e.target.checked }
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          Cartão de Crédito (Gateway Online)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                          <input 
                            type="checkbox"
                            checked={asaasConfig.methods.boleto}
                            onChange={(e) => setAsaasConfig({
                              ...asaasConfig,
                              methods: { ...asaasConfig.methods, boleto: e.target.checked }
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          Boleto Registrado
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-indigo-500" />
                          Webhook Callback URL (A2 Finanças Webhook)
                        </label>
                        <code className="block select-all text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 break-all font-mono font-bold">
                          {asaasConfig.webhookUrl || 'https://api.a2finances.com/api/v1/asaas/webhook'}
                        </code>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Webhook Secret Token
                        </label>
                        <code className="block text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 font-mono">
                          {asaasConfig.webhookToken || 'asaas_webhook_sec_token_a2_finances'}
                        </code>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saveAsaasSuccess ? 'Salvo com sucesso!' : 'Salvar Configuração Asaas'}
                    </button>
                  </form>
                </div>

                {/* Transactions Event Log list */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white">Log de Vendas Asaas</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Transações simuladas e vendas reais recebidas via webhook.</p>
                      </div>
                    </div>
                    {transactions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Deseja realmente limpar todos os logs de vendas de demonstração?')) {
                            clearAsaasTransactions();
                            setTransactions([]);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpar Logs Demo
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Data/ID</th>
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Plano</th>
                          <th className="py-3 px-4">Valor</th>
                          <th className="py-3 px-4">Método</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-semibold block text-slate-700 dark:text-slate-300">
                                {new Date(tx.date).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono block uppercase">{tx.id.substring(0, 12)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold block text-slate-800 dark:text-white">{tx.customerName}</span>
                              <span className="text-[10px] text-slate-400 block">{tx.customerEmail}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                {tx.plan}
                              </span>
                              {tx.couponUsed && (
                                <span className="block text-[8px] font-bold text-emerald-600 uppercase mt-0.5">🏷️ {tx.couponUsed}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-white">
                              R$ {tx.amount.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-semibold">
                              <span className="flex items-center gap-1 uppercase text-[10px]">
                                {tx.paymentMethod === 'pix' && <QrCode className="w-3.5 h-3.5 text-emerald-500" />}
                                {tx.paymentMethod === 'credit_card' && <CreditCard className="w-3.5 h-3.5 text-indigo-500" />}
                                {tx.paymentMethod === 'boleto' && <FileText className="w-3.5 h-3.5 text-amber-500" />}
                                {tx.paymentMethod === 'pix' ? 'Pix' : tx.paymentMethod === 'credit_card' ? 'Cartão' : 'Boleto'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide ${
                                tx.status === 'CONFIRMED' || tx.status === 'RECEIVED'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                                  : tx.status === 'PENDING'
                                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                                    : 'bg-red-50 dark:bg-red-950/20 text-red-600'
                              }`}>
                                {tx.status === 'CONFIRMED' || tx.status === 'RECEIVED' ? 'APROVADO' : tx.status === 'PENDING' ? 'PENDENTE' : 'VENCIDO'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: PRECIFICAÇÃO (PLANS EDIT, PROMOS, COUPONS) */}
          {activeTab === 'precificacao' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Plan parameters setup form */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white">Personalização de Valores & Recursos</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Configure os valores mensais, status ativo e os limites permitidos por cada assinatura.</p>
                  </div>
                </div>

                {/* Plan Selector buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['gratis', 'basico', 'medio', 'premium'].map((pKey) => (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => handleSelectPlanToEdit(pKey)}
                      className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                        selectedPlanToEdit === pKey
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Plano {pKey}
                    </button>
                  ))}
                </div>

                {/* Plan Status Enable/Disable Toggle */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">
                      Ativação do Plano {selectedPlanToEdit.toUpperCase()}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Escolha se os usuários podem assinar ou visualizar este plano.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPlanEnabled(!editingPlanEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                      editingPlanEnabled
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {editingPlanEnabled ? '✓ Plano Ativo' : '✕ Plano Desativado'}
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Nome de Exibição</label>
                      <input 
                        type="text" 
                        value={editingPlanName}
                        onChange={(e) => setEditingPlanName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Preço Mensal (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editingPlanPrice}
                        onChange={(e) => setEditingPlanPrice(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-black text-emerald-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Descrição Curta</label>
                    <input 
                      type="text" 
                      value={editingPlanDesc}
                      onChange={(e) => setEditingPlanDesc(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Limits setup */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800 space-y-4">
                    <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Limites Numéricos do Usuário</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      
                      {/* Contas Banco */}
                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Contas Banco</label>
                          {editingLimits.accounts === Infinity ? (
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 py-1 uppercase">Ilimitado</div>
                          ) : (
                            <input 
                              type="number" 
                              value={editingLimits.accounts ?? 5}
                              onChange={(e) => setEditingLimits({
                                ...editingLimits,
                                accounts: Number(e.target.value)
                              })}
                              className="w-full bg-transparent border-none p-0 text-sm font-extrabold text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                          )}
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1 select-none">
                          <input 
                            type="checkbox"
                            checked={editingLimits.accounts === Infinity}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              accounts: e.target.checked ? Infinity : 5
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">Ilimitado</span>
                        </label>
                      </div>

                      {/* Lanc. Mensais */}
                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Lanc. Mensais</label>
                          {editingLimits.transactions === Infinity ? (
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 py-1 uppercase">Ilimitado</div>
                          ) : (
                            <input 
                              type="number" 
                              value={editingLimits.transactions ?? 100}
                              onChange={(e) => setEditingLimits({
                                ...editingLimits,
                                transactions: Number(e.target.value)
                              })}
                              className="w-full bg-transparent border-none p-0 text-sm font-extrabold text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                          )}
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1 select-none">
                          <input 
                            type="checkbox"
                            checked={editingLimits.transactions === Infinity}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              transactions: e.target.checked ? Infinity : 100
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">Ilimitado</span>
                        </label>
                      </div>

                      {/* Metas Ativas */}
                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Metas Ativas</label>
                          {editingLimits.goals === Infinity ? (
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 py-1 uppercase">Ilimitado</div>
                          ) : (
                            <input 
                              type="number" 
                              value={editingLimits.goals ?? 5}
                              onChange={(e) => setEditingLimits({
                                ...editingLimits,
                                goals: Number(e.target.value)
                              })}
                              className="w-full bg-transparent border-none p-0 text-sm font-extrabold text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                          )}
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1 select-none">
                          <input 
                            type="checkbox"
                            checked={editingLimits.goals === Infinity}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              goals: e.target.checked ? Infinity : 5
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">Ilimitado</span>
                        </label>
                      </div>

                      {/* Recorrentes Max */}
                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Lanç. Recorrentes</label>
                          {editingLimits.recurringCount === Infinity ? (
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 py-1 uppercase">Ilimitado</div>
                          ) : (
                            <input 
                              type="number" 
                              value={editingLimits.recurringCount ?? 5}
                              onChange={(e) => setEditingLimits({
                                ...editingLimits,
                                recurringCount: Number(e.target.value)
                              })}
                              className="w-full bg-transparent border-none p-0 text-sm font-extrabold text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                          )}
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1 select-none">
                          <input 
                            type="checkbox"
                            checked={editingLimits.recurringCount === Infinity}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              recurringCount: e.target.checked ? Infinity : 5
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">Ilimitado</span>
                        </label>
                      </div>

                      {/* Parcelados Max */}
                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between min-h-[90px]">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Compras Parceladas</label>
                          {editingLimits.installmentsCount === Infinity ? (
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 py-1 uppercase">Ilimitado</div>
                          ) : (
                            <input 
                              type="number" 
                              value={editingLimits.installmentsCount ?? 5}
                              onChange={(e) => setEditingLimits({
                                ...editingLimits,
                                installmentsCount: Number(e.target.value)
                              })}
                              className="w-full bg-transparent border-none p-0 text-sm font-extrabold text-slate-800 dark:text-white focus:outline-none focus:ring-0"
                            />
                          )}
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1 select-none">
                          <input 
                            type="checkbox"
                            checked={editingLimits.installmentsCount === Infinity}
                            onChange={(e) => setEditingLimits({
                              ...editingLimits,
                              installmentsCount: e.target.checked ? Infinity : 5
                            })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight">Ilimitado</span>
                        </label>
                      </div>

                    </div>
                  </div>

                  {/* Feature toggles */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800 space-y-3">
                    <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Liberação de Recursos de IA & Avançados</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      
                      {/* Aba Recorrentes */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasRecurring: !editingLimits.hasRecurring })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          Aba / Recorrentes
                        </span>
                        {editingLimits.hasRecurring ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Aba Parcelados */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasInstallments: !editingLimits.hasInstallments })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                          Aba / Compras Parceladas
                        </span>
                        {editingLimits.hasInstallments !== false ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Aba Gráficos */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasCharts: !editingLimits.hasCharts })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                          Aba / Gráficos e Analíticos
                        </span>
                        {editingLimits.hasCharts !== false ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Aba Metas */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasGoalsTab: !editingLimits.hasGoalsTab })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-indigo-500" />
                          Aba / Metas e Objetivos
                        </span>
                        {editingLimits.hasGoalsTab !== false ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Aba Consultor IA */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasAiConsultant: !editingLimits.hasAiConsultant })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                          Aba / Consultor IA (A2Bot)
                        </span>
                        {editingLimits.hasAiConsultant ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Comandos de Voz */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasVoice: !editingLimits.hasVoice })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                          Comandos de Voz por IA
                        </span>
                        {editingLimits.hasVoice ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Modo Casal */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasCouple: !editingLimits.hasCouple })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          Modo Casal / Compartilhado
                        </span>
                        {editingLimits.hasCouple ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Importação Extrato */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasImport: !editingLimits.hasImport })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-indigo-500" />
                          Importação de Extrato
                        </span>
                        {editingLimits.hasImport ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      {/* Leitor Recibos */}
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasReceiptPhoto: !editingLimits.hasReceiptPhoto })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                          Foto Recibos por IA
                        </span>
                        {editingLimits.hasReceiptPhoto ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Liberado</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                    </div>
                  </div>

                  {/* Bullet features manager */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <ListPlus className="w-3.5 h-3.5 text-indigo-500" />
                      Balões de Vantagens (Features Badge)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Adicionar vantagem... (Ex: Lançamentos Ilimitados)"
                        value={newFeatureText}
                        onChange={(e) => setNewFeatureText(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddFeature}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                      {editingPlanFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80">
                          <span className="flex items-center gap-1.5">
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                            {feat}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={handleSavePlan}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savePricingSuccess ? 'Alterações Salvas!' : `Salvar Alterações do Plano ${selectedPlanToEdit.toUpperCase()}`}
                  </button>
                </div>
              </div>

              {/* Promos (billing cycles discount sliders) and Coupons manager */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Billing cycles panel */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-xl flex items-center justify-center">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">Descontos Ciclos de Faturamento</h3>
                      <p className="text-[9px] text-slate-400">Ative descontos automáticos para planos Semestral e Anual.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {promos.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 dark:text-white">{p.name}</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePromo(p.id)}
                            className="p-1 text-slate-500 hover:text-indigo-600"
                          >
                            {p.active ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-2 py-0.5 rounded">ATIVO</span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded">INATIVO</span>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max="50"
                            value={p.discountPercentage}
                            onChange={(e) => handleUpdatePromoDiscount(p.id, Number(e.target.value))}
                            className="flex-1 accent-indigo-600 h-1 rounded-lg"
                          />
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 w-8 text-right">{p.discountPercentage}% off</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coupons Manager */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">Cupons de Desconto</h3>
                      <p className="text-[9px] text-slate-400">Gere e delete cupons que os usuários inserem no checkout.</p>
                    </div>
                  </div>

                  {/* Create coupon form */}
                  <form onSubmit={handleCreateCoupon} className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Novo Cupom</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-400">Código Único</label>
                        <input 
                          type="text" 
                          placeholder="EX: IA50"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-400">Tipo Desconto</label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-400">Valor do Desconto</label>
                        <input 
                          type="number" 
                          placeholder="30"
                          value={newCouponValue || ''}
                          onChange={(e) => setNewCouponValue(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-400">Validade Expirar</label>
                        <input 
                          type="date" 
                          value={newCouponExpiry}
                          onChange={(e) => setNewCouponExpiry(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none text-slate-600 dark:text-slate-300"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Cupom
                    </button>
                    {couponSuccessMsg && (
                      <p className="text-[10px] font-extrabold text-emerald-500 text-center">{couponSuccessMsg}</p>
                    )}
                  </form>

                  {/* Active coupons list */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cupons Ativos ({coupons.length})</h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {coupons.map((c) => (
                        <div key={c.code} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl text-xs">
                          <div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase mr-1.5">{c.code}</span>
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {c.type === 'percentage' ? `${c.value}% off` : `R$ ${c.value.toFixed(2).replace('.', ',')} off`}
                            </span>
                            <span className="block text-[8px] text-slate-400 font-medium">Expira em: {c.expirationDate}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.code)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: REDES SOCIAIS & MÍDIAS (LANDING PAGE) */}
          {activeTab === 'midia' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">Configurações da Landing Page</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Configure o número do WhatsApp, vídeo do YouTube e links das redes sociais exibidos na página inicial.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* WhatsApp, E-mail & Vídeo */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Número do WhatsApp (Apenas Números com DDD e DDI 55)
                    </label>
                    <input 
                      type="text"
                      value={siteConfig.whatsappNumber}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, whatsappNumber: e.target.value })}
                      placeholder="Ex: 5511999999999"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      Usado no botão "Conversar no WhatsApp".
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      E-mail para Receber Sugestões do Site
                    </label>
                    <input 
                      type="email"
                      value={siteConfig.contactEmail || ''}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, contactEmail: e.target.value })}
                      placeholder="fabianofreitasfoto@hotmail.com"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      E-mail do administrador configurado para onde são direcionadas as sugestões da caixa de envio da página inicial.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Link do Vídeo Demonstrativo (Embed do YouTube)
                    </label>
                    <input 
                      type="text"
                      value={siteConfig.youtubeVideoUrl}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, youtubeVideoUrl: e.target.value })}
                      placeholder="Ex: https://www.youtube.com/embed/dQw4w9WgXcQ"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      Vídeo rodando diretamente no player do site. Pode usar links no formato embed: https://www.youtube.com/embed/SEU_VIDEO_ID
                    </span>
                  </div>
                </div>

                {/* Redes Sociais */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      URL do Instagram
                    </label>
                    <input 
                      type="text"
                      value={siteConfig.instagramUrl}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/suaconta"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      URL do Facebook
                    </label>
                    <input 
                      type="text"
                      value={siteConfig.facebookUrl}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/suapagina"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      URL do Canal do YouTube
                    </label>
                    <input 
                      type="text"
                      value={siteConfig.youtubeChannelUrl}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, youtubeChannelUrl: e.target.value })}
                      placeholder="https://youtube.com/@seucanal"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      URL do LinkedIn
                    </label>
                    <input 
                      type="text"
                      value={siteConfig.linkedinUrl}
                      onChange={(e) => setSiteConfigState({ ...siteConfig, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/company/suaempresa"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

              </div>

              {/* SEÇÃO CONFIGURAÇÃO DE FOTOS DO SITE */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                    🖼️ Fotos & Imagens da Landing Page
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Insira aqui as URLs das suas imagens personalizadas para os banners do topo e os 6 cards de recursos do site.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Banners */}
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Imagens dos Banners (Topo)
                    </h5>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL Foto Banner 1
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.banner1Image || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, banner1Image: e.target.value })}
                        placeholder="https://sua-imagem.com/banner1.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL Foto Banner 2
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.banner2Image || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, banner2Image: e.target.value })}
                        placeholder="https://sua-imagem.com/banner2.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Cards de Recursos (1 a 6) */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Imagens dos 6 Cards de Recursos
                    </h5>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card 1 - Lançamento por Voz
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.featureVoiceImage || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, featureVoiceImage: e.target.value })}
                        placeholder="https://sua-imagem.com/voz.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card 2 - Modo Casal Sincronizado
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.featureCoupleImage || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, featureCoupleImage: e.target.value })}
                        placeholder="https://sua-imagem.com/casal.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card 3 - Teto de Gastos
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.featureLimitImage || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, featureLimitImage: e.target.value })}
                        placeholder="https://sua-imagem.com/limite.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card 4 - Metas e Projetos
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.featureGoalsImage || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, featureGoalsImage: e.target.value })}
                        placeholder="https://sua-imagem.com/metas.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card 5 - Gráficos e Relatórios
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.featureChartsImage || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, featureChartsImage: e.target.value })}
                        placeholder="https://sua-imagem.com/graficos.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card 6 - Extrato Inteligente
                      </label>
                      <input 
                        type="text"
                        value={siteConfig.featureExtractImage || ''}
                        onChange={(e) => setSiteConfigState({ ...siteConfig, featureExtractImage: e.target.value })}
                        placeholder="https://sua-imagem.com/extrato.jpg"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO CAIXA DE SUGESTÕES RECEBIDAS */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Caixa de Entrada: Sugestões Recebidas pelo Site ({suggestionsList.length})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Sugestões e mensagens enviadas pelos visitantes através da caixa da página inicial.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      fetchSiteSuggestionsAsync().then(sugs => setSuggestionsList(sugs));
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
                    title="Atualizar lista"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {suggestionsList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-slate-400 text-xs">
                    Nenhuma sugestão recebida até o momento.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {suggestionsList.map((sug) => (
                      <div key={sug.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 dark:text-white text-xs">{sug.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({sug.email})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(sug.createdAt).toLocaleString('pt-BR')}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteSiteSuggestion(sug.id);
                                const sugs = await fetchSiteSuggestionsAsync();
                                setSuggestionsList(sugs);
                              }}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Excluir sugestão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          {sug.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {siteConfigSaved ? (
                  <span className="text-xs font-black text-emerald-500 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    Configurações salvas com sucesso!
                  </span>
                ) : <span />}

                <button
                  type="button"
                  onClick={() => {
                    saveSiteConfig(siteConfig);
                    setSiteConfigSaved(true);
                    setTimeout(() => setSiteConfigSaved(false), 3000);
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Links & Mídias
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* USER DETAILS MODAL (FICHA DO USUÁRIO) */}
      {selectedUserProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-md"
                  style={{ backgroundColor: selectedUserProfile.avatar_color || '#6366f1' }}
                >
                  {(selectedUserProfile.full_name || selectedUserProfile.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">Ficha Cadastral do Usuário</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedUserProfile.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserProfile(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Nome Completo</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    {selectedUserProfile.full_name || selectedUserProfile.name || 'Não informado'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">E-mail</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {selectedUserProfile.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">CPF</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedUserProfile.cpf || 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Celular / WhatsApp</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedUserProfile.phone || 'Pendente'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Plano Atual</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase">
                      {selectedUserProfile.tier || 'gratis'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Endereço Completo</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {selectedUserProfile.address || 'Não informado'}
                  </span>
                </div>
              </div>

              {/* Termos de Uso Status */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Aceite do Termo de Uso e Política de Privacidade
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  Status: <strong>{selectedUserProfile.terms_accepted ? 'Aceito pelo Usuário' : 'Não Aceito'}</strong>
                </p>
                {selectedUserProfile.terms_accepted_at && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Data e Hora do Registro: {new Date(selectedUserProfile.terms_accepted_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedUserProfile(null)}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs rounded-xl hover:opacity-90 transition-all"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MANUAL RELEASE MODAL */}
      {releaseModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden space-y-5">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setReleaseModalUser(null);
                setManualReleaseSuccessMsg(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                  Liberação Manual de Acesso
                </h3>
                <p className="text-xs text-slate-400">
                  Gerenciar e liberar degustação Premium para o usuário de teste
                </p>
              </div>
            </div>

            {/* User Info Card */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Usuário Selecionado</span>
                <p className="font-black text-slate-800 dark:text-white">{releaseModalUser.full_name || releaseModalUser.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{releaseModalUser.email || 'Sem e-mail'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Plano Atual</span>
                <p className="font-extrabold uppercase text-indigo-600 dark:text-indigo-400">{releaseModalUser.tier || 'gratis'}</p>
              </div>
            </div>

            {/* Success Message Banner */}
            {manualReleaseSuccessMsg && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {manualReleaseSuccessMsg}
              </div>
            )}

            {/* Action Options */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Escolha a Opção de Liberação:
              </p>

              {/* Option 1: Premium Vitalício / Manual */}
              <button
                disabled={updatingUserId === releaseModalUser.id}
                onClick={() => handleManualRelease(releaseModalUser.id, 'premium_vitalicio')}
                className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-left transition-all group flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                      ⚡ Liberar Premium Ilimitado (Manual)
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Libera acesso Premium permanente sem limites de tempo.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              {/* Option 2: Renovar +7 Dias de Teste */}
              <button
                disabled={updatingUserId === releaseModalUser.id}
                onClick={() => handleManualRelease(releaseModalUser.id, 'renovar_7')}
                className="w-full p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-left transition-all group flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-purple-900 dark:text-purple-200">
                      ⏰ Renovar +7 Dias de Teste Premium
                    </p>
                    <p className="text-[11px] text-purple-700 dark:text-purple-400">
                      Reinicia a contagem de 7 dias de degustação grátis a partir de hoje.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              {/* Option 3: Renovar +30 Dias de Degustação */}
              <button
                disabled={updatingUserId === releaseModalUser.id}
                onClick={() => handleManualRelease(releaseModalUser.id, 'renovar_30')}
                className="w-full p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-left transition-all group flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200">
                      📅 Conceder +30 Dias de Degustação Extra
                    </p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                      Oferece 30 dias de degustação Premium ao usuário.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              {/* Option 4: Rebaixar para Plano Grátis */}
              <button
                disabled={updatingUserId === releaseModalUser.id}
                onClick={() => handleManualRelease(releaseModalUser.id, 'gratis')}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Rebaixar para Plano Grátis (Bloquear/Encerrar Teste)
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setReleaseModalUser(null);
                  setManualReleaseSuccessMsg(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
