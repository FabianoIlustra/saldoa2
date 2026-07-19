import React, { useState } from 'react';
import { X, Check, Lock, Sparkles, CreditCard, QrCode, ShieldAlert, ArrowRight, Zap, RefreshCw, HelpCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTierUpdated: () => void;
}

export type PlanTier = 'gratis' | 'basico' | 'medio' | 'premium';

export const PLAN_DETAILS = {
  gratis: {
    name: 'Grátis',
    price: 'R$ 0',
    period: '',
    description: 'Comece a organizar suas finanças essenciais.',
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
      hasVoice: false,
      hasCouple: false,
      hasImport: false,
      hasRecurring: false,
    }
  },
  basico: {
    name: 'Básico',
    price: 'R$ 19,90',
    period: '/mês',
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
      hasVoice: true,
      hasCouple: false,
      hasImport: false,
      hasRecurring: false,
    }
  },
  medio: {
    name: 'Médio',
    price: 'R$ 39,90',
    period: '/mês',
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
      hasVoice: true,
      hasCouple: true,
      hasImport: true,
      hasRecurring: true,
    }
  },
  premium: {
    name: 'Premium',
    price: 'R$ 59,90',
    period: '/mês',
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
      hasVoice: true,
      hasCouple: true,
      hasImport: true,
      hasRecurring: true,
    }
  }
};

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, currentUser, onTierUpdated }) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Form State
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardName, setCardName] = useState(currentUser.name);
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');

  if (!isOpen) return null;

  const currentTier = currentUser.tier || 'gratis';

  const handleSelectPlan = (tier: PlanTier) => {
    if (tier === currentTier) return;
    setSelectedPlan(tier);
    setCheckoutStep('checkout');
  };

  const handleSimulatePayment = async () => {
    if (!selectedPlan) return;
    setIsSubmitting(true);
    try {
      // Direct update in supabase
      const { error } = await supabase
        .from('profiles')
        .update({ tier: selectedPlan })
        .eq('id', currentUser.id);

      if (error) throw error;

      setCheckoutStep('success');
      onTierUpdated();
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Ocorreu um erro ao processar o plano.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="subscription-modal" className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Planos de Acesso</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Seu plano atual: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{currentTier}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          
          {checkoutStep === 'plans' && (
            <div className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-white">Escolha o plano perfeito para você</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Desbloqueie ferramentas profissionais para o seu controle financeiro e tome decisões inteligentes em conjunto.
                </p>
              </div>

              {/* Bento Grid de Planos */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {(Object.keys(PLAN_DETAILS) as PlanTier[]).map((tier) => {
                  const plan = PLAN_DETAILS[tier];
                  const isCurrent = tier === currentTier;
                  const isPopular = tier === 'medio';

                  return (
                    <div 
                      key={tier} 
                      className={`relative flex flex-col rounded-3xl p-6 bg-white dark:bg-slate-950 border transition-all duration-300 ${
                        isCurrent 
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20' 
                          : isPopular
                            ? 'border-emerald-500 dark:border-emerald-600 shadow-xl dark:shadow-emerald-900/5 ring-4 ring-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-full shadow-lg">
                          RECOMENDADO
                        </span>
                      )}

                      <div className="space-y-4 flex-1">
                        <div>
                          <h4 className="text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">{plan.name}</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500 min-h-[32px] mt-1 leading-snug">{plan.description}</p>
                        </div>

                        <div className="py-2">
                          <span className="text-3xl font-black text-slate-800 dark:text-white">{plan.price}</span>
                          {plan.period && <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{plan.period}</span>}
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-2" />

                        <ul className="space-y-3">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8">
                        {isCurrent ? (
                          <div className="w-full text-center py-3 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold rounded-2xl text-xs border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
                            Seu Plano Ativo
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectPlan(tier)}
                            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                              isPopular
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none'
                                : tier === 'premium'
                                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            Upgrade
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {checkoutStep === 'checkout' && selectedPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Resumo do Pedido */}
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Resumo da Assinatura</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase">Plano {PLAN_DETAILS[selectedPlan].name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{PLAN_DETAILS[selectedPlan].description}</p>
                    </div>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{PLAN_DETAILS[selectedPlan].price} <span className="text-xs font-bold text-slate-400">{PLAN_DETAILS[selectedPlan].period}</span></span>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Recursos inclusos neste nível:</p>
                    <ul className="space-y-2.5">
                      {PLAN_DETAILS[selectedPlan].features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Banner informativo de simulação */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-5 rounded-3xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300">Ambiente de Testes / Modo Comercial</h5>
                    <p className="text-[11px] leading-relaxed text-amber-700/95 dark:text-amber-400/90">
                      Como você está rodando no editor do AI Studio, as transações financeiras são simuladas. Clique em <strong>"Simular Pagamento"</strong> para aprovar instantaneamente e atualizar o plano no banco de dados para testar todas as funcionalidades.
                    </p>
                  </div>
                </div>

                {/* Ajuda comercial / Como integrar de verdade */}
                <button 
                  onClick={() => setShowConfigHelp(!showConfigHelp)}
                  className="w-full text-left p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Como configuro para receber de verdade dos meus clientes?
                  </span>
                  <span className="text-lg font-normal">{showConfigHelp ? '−' : '+'}</span>
                </button>

                {showConfigHelp && (
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 space-y-3 animate-fadeIn">
                    <p className="font-bold text-slate-800 dark:text-white">Para receber pagamentos reais no seu app, você fará o seguinte:</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li><strong>Criar conta no Stripe, Asaas ou Mercado Pago</strong> e pegar a chave API Secreta.</li>
                      <li><strong>Criar um Webhook</strong> no gateway de pagamento apontando para o seu backend.</li>
                      <li><strong>No Checkout:</strong> Redirecionar o usuário para o Checkout pronto deles (Hosted Checkout), ou usar o Pix via API para gerar o QR code dinâmico.</li>
                      <li><strong>Ao receber a confirmação (Webhook):</strong> O gateway de pagamento avisa sua API, que atualiza a coluna <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 font-semibold">tier</code> do usuário na tabela <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-semibold">profiles</code> do Supabase para o plano comprado.</li>
                    </ol>
                    <p className="italic text-slate-400 dark:text-slate-500">Isto é extremamente simples e seguro pois toda a segurança do cartão é gerenciada pelo gateway homologado, sem riscos jurídicos para você!</p>
                  </div>
                )}
              </div>

              {/* Pagamento Simulado */}
              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-6">
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl gap-2">
                  <button 
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'credit_card' 
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Cartão de Crédito
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'pix' 
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    PIX Instantâneo
                  </button>
                </div>

                {paymentMethod === 'credit_card' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Número do Cartão</label>
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome no Cartão</label>
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiração</label>
                        <input 
                          type="text" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white text-center focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CVV</label>
                        <input 
                          type="text" 
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white text-center focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                    <div className="bg-slate-100 p-4 rounded-2xl dark:bg-slate-950">
                      {/* Simulação de QRCode de Pix */}
                      <svg viewBox="0 0 100 100" className="w-32 h-32 text-slate-800 dark:text-white" fill="currentColor">
                        <path d="M5 5h30v30H5zm5 5v20h20V10zm55-5h30v30h-30zm5 5v20h20V10zm-60 55h30v30H5zm5 5v20h20V65zm50 0h10v10h-10zm20 0h10v10h-10zm-10 10h10v10h-10zm10 10h10v10h-10zm-20 0h10v10h-10zm-10-10h10v10h-10zm0 20h20v10H65zm-25-10h10v10h-10zm-10-15h10v10h-10zm15-15h10v10h-10zm-15 0h10v10h-10zm25 15h10v10h-10zm-15 15h10v10H40zm25-15h10v10h-10z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Chave copia-e-cola gerada:</p>
                      <code className="text-[10px] bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 select-all block max-w-xs truncate mx-auto mt-1">
                        00020101021226870014br.gov.bcb.pix2565pix.saldo-a2.com/pay/sandbox/19329
                      </code>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSimulatePayment}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Simular Pagamento Seguro
                    </>
                  )}
                </button>

                <button 
                  onClick={() => setCheckoutStep('plans')}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Voltar para os Planos
                </button>
              </div>
            </div>
          )}

          {checkoutStep === 'success' && selectedPlan && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto my-auto py-12">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-none animate-bounce">
                <Check className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">Assinatura Ativada!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Parabéns! Seu plano foi atualizado para o nível <strong className="text-indigo-600 dark:text-indigo-400 uppercase">{PLAN_DETAILS[selectedPlan].name}</strong> com sucesso.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 w-full text-left space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Transação</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">#{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Plano contratado</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{selectedPlan}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Status</span>
                  <span className="font-extrabold text-emerald-500">APROVADO</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-xl transition-all"
              >
                Começar a usar agora
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SubscriptionModal;
