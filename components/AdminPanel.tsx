import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { 
  Users, ShieldCheck, DollarSign, Award, ArrowUpRight, Search, 
  Filter, Check, RefreshCw, Clipboard, Database, AlertCircle, TrendingUp,
  Settings, Key, Globe, Eye, EyeOff, Save, Receipt, QrCode, CreditCard, Clock,
  Plus, Trash2, Calendar, Percent, FileText, ToggleLeft, ToggleRight, Ticket,
  Cpu, CheckSquare, ListPlus
} from 'lucide-react';
import { 
  getPricingConfig, savePricingConfig, 
  getPromoConfig, savePromoConfig, 
  getCouponsConfig, saveCouponsConfig, 
  getAsaasConfig, saveAsaasConfig, 
  getAsaasTransactions, saveAsaasTransactions,
  PricingPlan, PromoPackage, DiscountCoupon, AsaasConfig, AsaasTransactionLog
} from '../services/adminSettings';

interface AdminPanelProps {
  currentUser: User;
}

interface DBProfile {
  id: string;
  name: string | null;
  avatar_color: string | null;
  pin: string | null;
  tier: string | null;
  role: string | null;
  email: string | null;
  created_at: string | null;
  couple_id: string | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<DBProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [copiedSQL, setCopiedSQL] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'usuarios' | 'financeiro' | 'precificacao'>('usuarios');

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
  const [newFeatureText, setNewFeatureText] = useState('');
  const [savePricingSuccess, setSavePricingSuccess] = useState(false);

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

      if (error) {
        throw error;
      }

      if (data) {
        setProfiles(data as DBProfile[]);
      }
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setErrorState(err.message || 'Row Level Security (RLS) limitou a busca.');
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

    // Initialize editing states for selected plan
    const initialPlan = pricing['basico'];
    if (initialPlan) {
      setEditingPlanName(initialPlan.name);
      setEditingPlanPrice(initialPlan.price);
      setEditingPlanDesc(initialPlan.description);
      setEditingPlanFeatures(initialPlan.features);
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
      setEditingLimits(plan.limits || {
        accounts: 1,
        transactions: 15,
        goals: 1,
        hasVoice: false,
        hasCouple: false,
        hasImport: false,
        hasRecurring: false,
        hasReceiptPhoto: false
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

  // Projections & stats: ADMs strictly excluded from paid plans, counters and revenue!
  const stats = React.useMemo(() => {
    const nonAdmins = profiles.filter(p => p.role !== 'admin');
    const total = profiles.length;
    const nonAdminCount = nonAdmins.length;
    const adminCount = profiles.filter(p => p.role === 'admin').length;

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
      gratis,
      basico,
      medio,
      premium,
      projectedRevenue
    };
  }, [profiles, pricingConfig]);

  // Filtered profiles for Users tab
  const filteredProfiles = React.useMemo(() => {
    return profiles.filter(p => {
      const name = p.name || '';
      const email = p.email || '';
      const tier = p.tier || 'gratis';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = tierFilter === 'all' || tier === tierFilter;
      return matchesSearch && matchesFilter;
    });
  }, [profiles, searchTerm, tierFilter]);

  const copySQLCommand = () => {
    const sql = `-- Execute este comando no editor SQL do Supabase para atualizar as permissões do Admin sem recursão:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'gratis';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Criação da função de verificação segura (evita recursão infinita na RLS do Supabase)
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assinaturas Pagas</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {loading ? '...' : stats.basico + stats.medio + stats.premium}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium">{stats.premium} Premium, {stats.medio} Médio, {stats.basico} Básico</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversão Ativa</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {loading ? '...' : `${stats.nonAdminCount > 0 ? (((stats.basico + stats.medio + stats.premium) / stats.nonAdminCount) * 100).toFixed(1) : 0}%`}
            </h3>
            <span className="text-[9px] text-slate-400 font-medium">De clientes não-admins</span>
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
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl max-w-lg gap-1 border border-slate-200/40 dark:border-slate-800/20">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'usuarios'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
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
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'precificacao'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/50'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          Precificação
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
                      placeholder="Pesquisar por nome ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter */}
                  <div className="relative w-full md:w-48">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select 
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                      <option value="all">Todos os Planos</option>
                      <option value="gratis">Grátis</option>
                      <option value="basico">Básico</option>
                      <option value="medio">Médio</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  Mostrando <span className="text-indigo-600 dark:text-indigo-400">{filteredProfiles.length}</span> de {profiles.length} usuários
                </div>
              </div>

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
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4">E-mail</th>
                        <th className="px-6 py-4">Tipo de Acesso (Plano)</th>
                        <th className="px-6 py-4">Status no Banco</th>
                        <th className="px-6 py-4">Vínculo Casal</th>
                        <th className="px-6 py-4 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                      {filteredProfiles.map((p) => {
                        const isSelf = p.id === currentUser.id;
                        const tier = p.tier || 'gratis';
                        const role = p.role || 'user';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            {/* Avatar & Name */}
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs"
                                style={{ backgroundColor: p.avatar_color || '#6366f1' }}
                              >
                                {(p.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                                  {p.name || 'Sem nome'}
                                  {isSelf && (
                                    <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                                      Você
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">ID: ...{p.id.substring(p.id.length - 8)}</p>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                              {p.email || <span className="text-slate-400 italic">Desconhecido</span>}
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

                            {/* Role Status */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase ${
                                role === 'admin'
                                  ? 'bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {role === 'admin' ? 'Admin (Isento)' : 'Usuário'}
                              </span>
                            </td>

                            {/* Couple Connection */}
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                              {p.couple_id ? (
                                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                  ● Conectado
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Individual</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <select
                                  value={tier}
                                  disabled={updatingUserId === p.id}
                                  onChange={(e) => handleUpdateUserTier(p.id, e.target.value as any)}
                                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700 dark:text-slate-200 uppercase"
                                >
                                  <option value="gratis">Plano Grátis</option>
                                  <option value="basico">Plano Básico</option>
                                  <option value="medio">Plano Médio</option>
                                  <option value="premium">Plano Premium</option>
                                </select>

                                {!isSelf && (
                                  <select
                                    value={role}
                                    disabled={updatingUserId === p.id}
                                    onChange={(e) => handleUpdateUserRole(p.id, e.target.value as any)}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700 dark:text-slate-200 uppercase"
                                  >
                                    <option value="user">Usuário</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                )}
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

          {/* TAB 2: FINANCEIRO (ASAAS SETUP & LOGS) */}
          {activeTab === 'financeiro' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
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
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Configure os valores mensais e os limites permitidos por cada assinatura.</p>
                  </div>
                </div>

                {/* Plan Selector buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {['basico', 'medio', 'premium'].map((pKey) => (
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
                    <div className="grid grid-cols-3 gap-3">
                      
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

                    </div>
                  </div>

                  {/* Feature toggles */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800 space-y-3">
                    <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Liberação de Recursos de IA & Avançados</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasVoice: !editingLimits.hasVoice })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                          Comandos de Voz IA (A2Bot)
                        </span>
                        {editingLimits.hasVoice ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingLimits({ ...editingLimits, hasCouple: !editingLimits.hasCouple })}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          Modo Casal Compartilhado
                        </span>
                        {editingLimits.hasCouple ? (
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

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
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bloqueado</span>
                        )}
                      </button>

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
                          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span>
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

        </div>
      )}
    </div>
  );
};

export default AdminPanel;
