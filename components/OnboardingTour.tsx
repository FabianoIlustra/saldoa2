import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Settings, 
  CreditCard, 
  Tag, 
  Target, 
  Repeat, 
  PlusCircle, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight,
  Compass,
  Bell
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId?: string;
  mobileTargetId?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stepNumber: number;
  totalSteps: number;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSettings: (section?: string) => void;
  onNavigateToTab: (tab: string) => void;
  onOpenManualForm?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigateToSettings,
  onNavigateToTab,
  onOpenManualForm
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubblePosition, setBubblePosition] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
    tailOffset: number;
  }>({
    top: 100,
    left: 20,
    placement: 'bottom',
    tailOffset: 50
  });

  const bubbleRef = useRef<HTMLDivElement>(null);

  // Sempre que o tour for aberto, reinicia no passo 0 (do começo)
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const steps: TourStep[] = [
    {
      id: 'accounts-banks',
      targetId: 'tour-accounts-card',
      mobileTargetId: 'tour-accounts-card',
      title: '1. Contas Bancárias 🏦',
      description: 'Primeiro passo: Cadastre seus bancos e contas (Nubank, Itaú, etc.) para definir os saldos iniciais de cada instituição.',
      icon: <CreditCard className="w-4 h-4 text-blue-500" />,
      stepNumber: 1,
      totalSteps: 7,
      preferredPlacement: 'bottom',
      actionButton: {
        label: 'Configurar Contas ➔',
        onClick: () => {
          onNavigateToSettings('contas');
        }
      }
    },
    {
      id: 'categories-ceiling',
      targetId: 'tour-ceiling-card',
      mobileTargetId: 'tour-ceiling-card',
      title: '2. Categorias e Teto 🎯',
      description: 'Segundo passo: Personalize suas categorias e defina um teto mensal de gastos para receber alertas visuais de limite.',
      icon: <Target className="w-4 h-4 text-emerald-500" />,
      stepNumber: 2,
      totalSteps: 7,
      preferredPlacement: 'bottom',
      actionButton: {
        label: 'Definir Teto e Categorias ➔',
        onClick: () => {
          onNavigateToSettings('teto');
        }
      }
    },
    {
      id: 'welcome-balance',
      targetId: 'tour-main-balance',
      mobileTargetId: 'tour-main-balance',
      title: '3. Saldo Consolidado 💰',
      description: 'Acompanhe seu saldo total em tempo real somando todas as suas contas bancárias e a evolução de receitas e despesas.',
      icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
      stepNumber: 3,
      totalSteps: 7,
      preferredPlacement: 'bottom',
      actionButton: {
        label: 'Ver Início ➔',
        onClick: () => {
          onNavigateToTab('dashboard');
        }
      }
    },
    {
      id: 'tab-recurring',
      targetId: 'tour-tab-validation',
      mobileTargetId: 'tour-recurring-indicator',
      title: '4. Contas Recorrentes 🔁',
      description: 'Cadastre despesas fixas (aluguel, internet, assinaturas) para previsões automáticas de fluxo e lembretes de vencimento.',
      icon: <Repeat className="w-4 h-4 text-amber-500" />,
      stepNumber: 4,
      totalSteps: 7,
      preferredPlacement: 'right',
      actionButton: {
        label: 'Ir para Recorrentes ➔',
        onClick: () => {
          onNavigateToTab('validation');
        }
      }
    },
    {
      id: 'tab-installments',
      targetId: 'tour-tab-parcelados',
      mobileTargetId: 'tour-installments-indicator',
      title: '5. Compras Parceladas 💳',
      description: 'Acompanhe faturas futuras e saiba exatamente quanto vai pagar em cada mês nas compras do cartão de crédito.',
      icon: <CreditCard className="w-4 h-4 text-rose-500" />,
      stepNumber: 5,
      totalSteps: 7,
      preferredPlacement: 'right',
      actionButton: {
        label: 'Ir para Parcelados ➔',
        onClick: () => {
          onNavigateToTab('parcelados');
        }
      }
    },
    {
      id: 'launch-actions',
      targetId: 'tour-launch-buttons',
      mobileTargetId: 'tour-launch-buttons',
      title: '6. Novo Lançamento ✍️',
      description: 'Agora com contas e categorias prontas, adicione despesas e receitas facilmente por texto ou por comando de voz!',
      icon: <PlusCircle className="w-4 h-4 text-blue-500" />,
      stepNumber: 6,
      totalSteps: 7,
      preferredPlacement: 'bottom',
      actionButton: {
        label: 'Abrir Lançamento (+)',
        onClick: () => {
          if (onOpenManualForm) onOpenManualForm();
        }
      }
    },
    {
      id: 'help-tips-header',
      targetId: 'tour-help-btn',
      mobileTargetId: 'tour-help-btn-mobile',
      title: '7. Pronto para Usar! ✨',
      description: 'Tudo pronto! Você pode rever este tour clicando no (?) a qualquer momento e ver alertas de contas no sininho.',
      icon: <HelpCircle className="w-4 h-4 text-indigo-500" />,
      stepNumber: 7,
      totalSteps: 7,
      preferredPlacement: 'bottom',
      actionButton: {
        label: 'Concluir Tour ✨',
        onClick: () => {
          onClose();
        }
      }
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Dynamic position calculation for Comic Speech Bubble & Tail Pointer
  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const isMobile = window.innerWidth < 768;
    const targetElementId = (isMobile && currentStep.mobileTargetId) 
      ? currentStep.mobileTargetId 
      : (currentStep.targetId || currentStep.mobileTargetId);

    let el = targetElementId ? document.getElementById(targetElementId) : null;

    // Fallback if specific target isn't on current view
    if (!el && currentStep.targetId) {
      el = document.getElementById(currentStep.targetId);
    }
    if (!el && currentStep.mobileTargetId) {
      el = document.getElementById(currentStep.mobileTargetId);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll into view if out of viewport
      if (rect.top < 60 || rect.bottom > window.innerHeight - 60) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      const bubbleW = Math.min(320, window.innerWidth - 32);
      const bubbleH = bubbleRef.current ? bubbleRef.current.offsetHeight : 190;
      const margin = 14;

      let placement: 'top' | 'bottom' | 'left' | 'right' = currentStep.preferredPlacement || 'bottom';
      let top = 0;
      let left = 0;
      let tailOffset = 50;

      // Smart placement logic
      if (isMobile) {
        // On mobile: strictly prefer top or bottom placement to stay inside viewport
        if (rect.top > bubbleH + margin + 40) {
          placement = 'top';
          top = rect.top - bubbleH - margin;
        } else {
          placement = 'bottom';
          top = rect.bottom + margin;
        }
        // Center horizontally aligned with target
        left = rect.left + rect.width / 2 - bubbleW / 2;
        left = Math.max(16, Math.min(window.innerWidth - bubbleW - 16, left));
        tailOffset = Math.max(16, Math.min(bubbleW - 24, rect.left + rect.width / 2 - left));
      } else {
        // Desktop placement logic
        if (placement === 'right' && rect.right + bubbleW + margin < window.innerWidth) {
          left = rect.right + margin;
          top = rect.top + rect.height / 2 - bubbleH / 2;
          top = Math.max(16, Math.min(window.innerHeight - bubbleH - 16, top));
          tailOffset = Math.max(16, Math.min(bubbleH - 24, rect.top + rect.height / 2 - top));
        } else if (placement === 'left' && rect.left - bubbleW - margin > 16) {
          left = rect.left - bubbleW - margin;
          top = rect.top + rect.height / 2 - bubbleH / 2;
          top = Math.max(16, Math.min(window.innerHeight - bubbleH - 16, top));
          tailOffset = Math.max(16, Math.min(bubbleH - 24, rect.top + rect.height / 2 - top));
        } else if (rect.bottom + bubbleH + margin < window.innerHeight) {
          placement = 'bottom';
          top = rect.bottom + margin;
          left = rect.left + rect.width / 2 - bubbleW / 2;
          left = Math.max(16, Math.min(window.innerWidth - bubbleW - 16, left));
          tailOffset = Math.max(16, Math.min(bubbleW - 24, rect.left + rect.width / 2 - left));
        } else {
          placement = 'top';
          top = rect.top - bubbleH - margin;
          left = rect.left + rect.width / 2 - bubbleW / 2;
          left = Math.max(16, Math.min(window.innerWidth - bubbleW - 16, left));
          tailOffset = Math.max(16, Math.min(bubbleW - 24, rect.left + rect.width / 2 - left));
        }
      }

      setBubblePosition({
        top: Math.max(12, Math.min(window.innerHeight - bubbleH - 12, top)),
        left: Math.max(12, Math.min(window.innerWidth - bubbleW - 12, left)),
        placement,
        tailOffset
      });
    } else {
      // Centered fallback if element not in DOM
      setTargetRect(null);
      const bubbleW = Math.min(320, window.innerWidth - 32);
      setBubblePosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - bubbleW / 2,
        placement: 'bottom',
        tailOffset: bubbleW / 2
      });
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const timer = setTimeout(updatePosition, 150);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimeout(timer);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] pointer-events-none select-none animate-in fade-in duration-200">
      {/* Light backdrop to preserve context and visibility */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1.5px] pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Target Element Spotlight Highlight Ring */}
      {targetRect && (
        <div 
          className="fixed pointer-events-none rounded-2xl ring-4 ring-indigo-500/90 ring-offset-2 ring-offset-slate-950/20 transition-all duration-300 z-[165] animate-pulse"
          style={{
            top: `${Math.max(6, targetRect.top - 4)}px`,
            left: `${Math.max(6, targetRect.left - 4)}px`,
            width: `${Math.min(window.innerWidth - 12, targetRect.width + 8)}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* Comic Speech Bubble / Balão de Conversa */}
      <div 
        ref={bubbleRef}
        style={{
          top: `${bubblePosition.top}px`,
          left: `${bubblePosition.left}px`,
        }}
        className="fixed z-[170] pointer-events-auto w-[290px] sm:w-[330px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl shadow-2xl p-3.5 sm:p-4 text-slate-900 dark:text-slate-100 transition-all duration-300 ease-out"
        role="dialog"
        aria-modal="true"
      >
        {/* Pointer / Ponta do Balão Triangular Tail pointing to target element */}
        {targetRect && (
          <>
            {bubblePosition.placement === 'bottom' && (
              <div 
                className="absolute -top-2.5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-indigo-200 dark:border-b-indigo-800"
                style={{ left: `${bubblePosition.tailOffset - 10}px` }}
              >
                <div className="absolute top-[1.5px] -left-[9px] w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[9px] border-b-white dark:border-b-slate-900" />
              </div>
            )}
            {bubblePosition.placement === 'top' && (
              <div 
                className="absolute -bottom-2.5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-indigo-200 dark:border-t-indigo-800"
                style={{ left: `${bubblePosition.tailOffset - 10}px` }}
              >
                <div className="absolute -top-[10.5px] -left-[9px] w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] border-t-white dark:border-t-slate-900" />
              </div>
            )}
            {bubblePosition.placement === 'right' && (
              <div 
                className="absolute -left-2.5 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[10px] border-r-indigo-200 dark:border-r-indigo-800"
                style={{ top: `${bubblePosition.tailOffset - 10}px` }}
              >
                <div className="absolute -top-[9px] left-[1.5px] w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-r-[9px] border-r-white dark:border-r-slate-900" />
              </div>
            )}
            {bubblePosition.placement === 'left' && (
              <div 
                className="absolute -right-2.5 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[10px] border-l-indigo-200 dark:border-l-indigo-800"
                style={{ top: `${bubblePosition.tailOffset - 10}px` }}
              >
                <div className="absolute -top-[9px] -left-[10.5px] w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[9px] border-l-white dark:border-l-slate-900" />
              </div>
            )}
          </>
        )}

        {/* Bubble Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
              {currentStep.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {currentStep.stepNumber}/{currentStep.totalSteps}
              </span>
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                {currentStep.title}
              </h4>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bubble Objective Description */}
        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-3">
          {currentStep.description}
        </p>

        {/* Discreet "Ir" Button */}
        {currentStep.actionButton && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => {
                currentStep.actionButton?.onClick();
              }}
              className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 font-black text-[11px] rounded-xl flex items-center justify-between transition-all active:scale-98 shadow-2xs"
            >
              <span>{currentStep.actionButton.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bubble Footer Navigation Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1 rounded-full transition-all duration-200 ${
                  idx === currentStepIndex 
                    ? 'w-4 bg-indigo-600 dark:bg-indigo-400' 
                    : 'w-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
                title={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Ant</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg transition-all active:scale-95 shadow-2xs flex items-center gap-1"
            >
              <span>{currentStepIndex === steps.length - 1 ? 'Concluir' : 'Próximo'}</span>
              {currentStepIndex < steps.length - 1 ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
