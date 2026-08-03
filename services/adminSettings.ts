import { supabase } from './supabase';

export interface PricingPlan {
  name: string;
  price: number; // as a numeric value, e.g. 19.90
  description: string;
  features: string[];
  enabled?: boolean; // Toggles whether the plan (e.g. Plano Grátis) is active for new signups
  limits: {
    accounts: number;
    transactions: number;
    goals: number;
    recurringCount?: number;
    installmentsCount?: number;
    hasVoice: boolean;
    hasCouple: boolean;
    hasImport: boolean;
    hasRecurring: boolean;
    hasInstallments?: boolean;
    hasCharts?: boolean;
    hasGoalsTab?: boolean;
    hasAiConsultant?: boolean;
    hasReceiptPhoto?: boolean;
  };
}

export interface PromoPackage {
  id: 'annual' | 'semiannual';
  name: string;
  discountPercentage: number;
  active: boolean;
}

export interface DiscountCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // e.g. 10 for 10% or R$ 10
  expirationDate: string;
  active: boolean;
}

export interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  webhookToken: string;
  webhookUrl: string;
  methods: {
    pix: boolean;
    boleto: boolean;
    creditCard: boolean;
  };
  connected: boolean;
}

export interface AsaasTransactionLog {
  id: string;
  date: string;
  customerEmail: string;
  customerName: string;
  plan: string;
  amount: number;
  paymentMethod: 'pix' | 'boleto' | 'credit_card';
  status: 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'PENDING';
  couponUsed?: string;
}

const DEFAULT_PRICING: Record<string, PricingPlan> = {
  gratis: {
    name: 'Grátis',
    price: 0,
    description: 'Comece a organizar suas finanças essenciais.',
    enabled: true,
    features: [
      'Até 1 Conta Cadastrada',
      'Até 15 Lançamentos por Mês',
      'Até 1 Meta Ativa',
      'Filtros Básicos de Transações',
    ],
    limits: {
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
    }
  },
  basico: {
    name: 'Básico',
    price: 19.90,
    description: 'Perfeito para controle individual avançado.',
    features: [
      'Até 3 Contas Cadastradas',
      'Até 50 Lançamentos por Mês',
      'Até 3 Metas Ativas',
      'Comando de Voz por IA (A2Bot)',
      'Relatórios em Gráficos',
    ],
    limits: {
      accounts: 3,
      transactions: 50,
      goals: 3,
      recurringCount: 5,
      installmentsCount: 5,
      hasVoice: true,
      hasCouple: false,
      hasImport: false,
      hasRecurring: true,
      hasInstallments: true,
      hasCharts: true,
      hasGoalsTab: true,
      hasAiConsultant: false,
      hasReceiptPhoto: false,
    }
  },
  medio: {
    name: 'Médio',
    price: 39.90,
    description: 'Ideal para casais ou famílias organizadas.',
    features: [
      'Até 10 Contas Cadastradas',
      'Até 200 Lançamentos por Mês',
      'Até 10 Metas Ativas',
      'Comando de Voz por IA (A2Bot)',
      'Modo Compartilhado / Casal',
      'Importação de Extrato Bancário',
      'Regras de Categorização por IA',
    ],
    limits: {
      accounts: 10,
      transactions: 200,
      goals: 10,
      recurringCount: 20,
      installmentsCount: 20,
      hasVoice: true,
      hasCouple: true,
      hasImport: true,
      hasRecurring: true,
      hasInstallments: true,
      hasCharts: true,
      hasGoalsTab: true,
      hasAiConsultant: true,
      hasReceiptPhoto: false,
    }
  },
  premium: {
    name: 'Premium',
    price: 59.90,
    description: 'Acesso ilimitado e assessoria financeira total.',
    features: [
      'Contas e Metas ILIMITADAS',
      'Lançamentos ILIMITADOS',
      'Comando de Voz e IA Sem Limites',
      'Modo Compartilhado / Casal',
      'Importação de Extrato Inteligente',
      'Validação de Recorrentes Automática',
      'Leitor de Recibos por Foto',
      'Suporte Prioritário',
    ],
    limits: {
      accounts: Infinity,
      transactions: Infinity,
      goals: Infinity,
      recurringCount: Infinity,
      installmentsCount: Infinity,
      hasVoice: true,
      hasCouple: true,
      hasImport: true,
      hasRecurring: true,
      hasInstallments: true,
      hasCharts: true,
      hasGoalsTab: true,
      hasAiConsultant: true,
      hasReceiptPhoto: true,
    }
  }
};

const DEFAULT_PROMOS: PromoPackage[] = [
  { id: 'annual', name: 'Plano Anual', discountPercentage: 20, active: true },
  { id: 'semiannual', name: 'Plano Semestral', discountPercentage: 10, active: true }
];

const DEFAULT_COUPONS: DiscountCoupon[] = [
  { code: 'BEMVINDO30', type: 'percentage', value: 30, expirationDate: '2026-12-31', active: true },
  { code: 'QUEROIA', type: 'percentage', value: 15, expirationDate: '2026-10-30', active: true },
  { code: 'CASAL10', type: 'percentage', value: 10, expirationDate: '2026-12-25', active: true },
  { code: 'ADMINFREE', type: 'percentage', value: 100, expirationDate: '2027-01-01', active: true }
];

const DEFAULT_ASAAS: AsaasConfig = {
  apiKey: '',
  environment: 'sandbox',
  webhookToken: 'asaas_webhook_sec_token_a2_finances',
  webhookUrl: 'https://api.a2finances.com/api/v1/asaas/webhook',
  methods: {
    pix: true,
    boleto: true,
    creditCard: true
  },
  connected: false
};

const DEFAULT_TRANSACTIONS: AsaasTransactionLog[] = [
  {
    id: 'pay_932918239012',
    date: '2026-07-19T14:32:00',
    customerEmail: 'mariasilva@gmail.com',
    customerName: 'Maria Silva',
    plan: 'medio',
    amount: 39.90,
    paymentMethod: 'pix',
    status: 'CONFIRMED'
  },
  {
    id: 'pay_128390128392',
    date: '2026-07-19T10:15:00',
    customerEmail: 'joaocarlos@outlook.com',
    customerName: 'João Carlos',
    plan: 'basico',
    amount: 19.90,
    paymentMethod: 'credit_card',
    status: 'RECEIVED'
  },
  {
    id: 'pay_481203810238',
    date: '2026-07-18T18:44:00',
    customerEmail: 'gabriel.costa@hotmail.com',
    customerName: 'Gabriel Costa',
    plan: 'premium',
    amount: 41.93, // Premium with 30% discount coupon
    paymentMethod: 'pix',
    status: 'CONFIRMED',
    couponUsed: 'BEMVINDO30'
  },
  {
    id: 'pay_581902830912',
    date: '2026-07-17T09:00:00',
    customerEmail: 'lucas.pereira@gmail.com',
    customerName: 'Lucas Pereira',
    plan: 'basico',
    amount: 19.90,
    paymentMethod: 'boleto',
    status: 'PENDING'
  }
];

export const getPricingConfig = (): Record<string, PricingPlan> => {
  const data = localStorage.getItem('finan_ai_pricing');
  if (!data) {
    localStorage.setItem('finan_ai_pricing', JSON.stringify(DEFAULT_PRICING, (key, value) => {
      if (value === Infinity) return "Infinity";
      return value;
    }));
    return DEFAULT_PRICING;
  }
  return JSON.parse(data, (key, value) => {
    if (value === "Infinity") return Infinity;
    return value;
  });
};

export const savePricingConfig = (config: Record<string, PricingPlan>) => {
  localStorage.setItem('finan_ai_pricing', JSON.stringify(config, (key, value) => {
    if (value === Infinity) return "Infinity";
    return value;
  }));
};

export const getPromoConfig = (): PromoPackage[] => {
  const data = localStorage.getItem('finan_ai_promos');
  if (!data) {
    localStorage.setItem('finan_ai_promos', JSON.stringify(DEFAULT_PROMOS));
    return DEFAULT_PROMOS;
  }
  return JSON.parse(data);
};

export const savePromoConfig = (promos: PromoPackage[]) => {
  localStorage.setItem('finan_ai_promos', JSON.stringify(promos));
};

export const getCouponsConfig = (): DiscountCoupon[] => {
  const data = localStorage.getItem('finan_ai_coupons');
  if (!data) {
    localStorage.setItem('finan_ai_coupons', JSON.stringify(DEFAULT_COUPONS));
    return DEFAULT_COUPONS;
  }
  return JSON.parse(data);
};

export const saveCouponsConfig = (coupons: DiscountCoupon[]) => {
  localStorage.setItem('finan_ai_coupons', JSON.stringify(coupons));
};

export const getAsaasConfig = (): AsaasConfig => {
  const data = localStorage.getItem('finan_ai_asaas');
  if (!data) {
    localStorage.setItem('finan_ai_asaas', JSON.stringify(DEFAULT_ASAAS));
    return DEFAULT_ASAAS;
  }
  return JSON.parse(data);
};

export const saveAsaasConfig = (config: AsaasConfig) => {
  localStorage.setItem('finan_ai_asaas', JSON.stringify(config));
};

export const getAsaasTransactions = (): AsaasTransactionLog[] => {
  const data = localStorage.getItem('finan_ai_asaas_txs');
  if (!data) {
    localStorage.setItem('finan_ai_asaas_txs', JSON.stringify(DEFAULT_TRANSACTIONS));
    return DEFAULT_TRANSACTIONS;
  }
  return JSON.parse(data);
};

export const saveAsaasTransactions = (txs: AsaasTransactionLog[]) => {
  localStorage.setItem('finan_ai_asaas_txs', JSON.stringify(txs));
};

export const addAsaasTransaction = (tx: Omit<AsaasTransactionLog, 'id' | 'date'>) => {
  const txs = getAsaasTransactions();
  const newTx: AsaasTransactionLog = {
    ...tx,
    id: `pay_${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    date: new Date().toISOString()
  };
  txs.unshift(newTx);
  saveAsaasTransactions(txs);
  return newTx;
};

export interface SiteConfig {
  whatsappNumber: string;
  contactEmail: string;
  youtubeVideoUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeChannelUrl: string;
  linkedinUrl: string;
  // Custom Site Images
  banner1Image?: string;
  banner2Image?: string;
  featureVoiceImage?: string;
  featureCoupleImage?: string;
  featureLimitImage?: string;
  featureGoalsImage?: string;
  featureChartsImage?: string;
  featureExtractImage?: string;
}

export interface UserSuggestion {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

const DEFAULT_SITE_CONFIG: SiteConfig = {
  whatsappNumber: '5511999999999',
  contactEmail: 'fabianofreitasfoto@hotmail.com',
  youtubeVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  instagramUrl: 'https://instagram.com',
  facebookUrl: 'https://facebook.com',
  youtubeChannelUrl: 'https://youtube.com',
  linkedinUrl: 'https://linkedin.com',
  banner1Image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1600',
  banner2Image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1600',
  featureVoiceImage: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=800',
  featureCoupleImage: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?auto=format&fit=crop&q=80&w=800',
  featureLimitImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800',
  featureGoalsImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
  featureChartsImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
  featureExtractImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
};

export const getSiteConfig = (): SiteConfig => {
  const data = localStorage.getItem('finan_ai_site_config');
  if (!data) {
    localStorage.setItem('finan_ai_site_config', JSON.stringify(DEFAULT_SITE_CONFIG));
    return DEFAULT_SITE_CONFIG;
  }
  try {
    return { ...DEFAULT_SITE_CONFIG, ...JSON.parse(data) };
  } catch (e) {
    return DEFAULT_SITE_CONFIG;
  }
};

export const fetchSiteConfigAsync = async (): Promise<SiteConfig> => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data && data.config) {
      const mergedConfig = { ...DEFAULT_SITE_CONFIG, ...data.config };
      localStorage.setItem('finan_ai_site_config', JSON.stringify(mergedConfig));
      return mergedConfig;
    }
  } catch (err) {
    console.warn('Erro ao carregar site_settings do Supabase:', err);
  }
  return getSiteConfig();
};

export const saveSiteConfig = async (config: SiteConfig) => {
  localStorage.setItem('finan_ai_site_config', JSON.stringify(config));
  try {
    await supabase.from('site_settings').upsert({
      id: 'default',
      config,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao salvar site_settings no Supabase:', err);
  }
};

export const getSiteSuggestions = (): UserSuggestion[] => {
  const data = localStorage.getItem('finan_ai_suggestions');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const fetchSiteSuggestionsAsync = async (): Promise<UserSuggestion[]> => {
  try {
    const { data, error } = await supabase
      .from('site_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: UserSuggestion[] = data.map(item => ({
        id: item.id,
        name: item.name,
        email: item.email,
        message: item.message,
        createdAt: item.created_at || new Date().toISOString()
      }));
      localStorage.setItem('finan_ai_suggestions', JSON.stringify(mapped));
      return mapped;
    }
  } catch (err) {
    console.warn('Erro ao carregar sugestões do Supabase:', err);
  }
  return getSiteSuggestions();
};

export const addSiteSuggestion = async (s: { name: string; email: string; message: string }) => {
  const newSuggestion: UserSuggestion = {
    id: `sug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: s.name,
    email: s.email,
    message: s.message,
    createdAt: new Date().toISOString()
  };

  const list = getSiteSuggestions();
  list.unshift(newSuggestion);
  localStorage.setItem('finan_ai_suggestions', JSON.stringify(list));

  try {
    await supabase.from('site_suggestions').insert([{
      id: newSuggestion.id,
      name: newSuggestion.name,
      email: newSuggestion.email,
      message: newSuggestion.message,
      created_at: newSuggestion.createdAt
    }]);
  } catch (err) {
    console.error('Erro ao salvar sugestão no Supabase:', err);
  }

  return newSuggestion;
};

export const deleteSiteSuggestion = async (id: string) => {
  const list = getSiteSuggestions().filter(s => s.id !== id);
  localStorage.setItem('finan_ai_suggestions', JSON.stringify(list));

  try {
    await supabase.from('site_suggestions').delete().eq('id', id);
  } catch (err) {
    console.error('Erro ao deletar sugestão do Supabase:', err);
  }
};

export const clearAsaasTransactions = () => {
  localStorage.setItem('finan_ai_asaas_txs', JSON.stringify([]));
};

