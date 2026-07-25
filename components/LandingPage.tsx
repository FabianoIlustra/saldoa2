import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Sparkles, Heart, Mic, ArrowRight, CheckCircle2, Zap, 
  PieChart, Target, Check, Play, MessageCircle, Instagram, Facebook, Youtube, Linkedin,
  BarChart3, Users, ShieldCheck, Send, Mail, MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPricingConfig, getSiteConfig, fetchSiteConfigAsync, addSiteSuggestion, PricingPlan, SiteConfig } from '../services/adminSettings';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Slider state for Hero Banners
  const [currentSlide, setCurrentSlide] = useState(0);

  // Dynamic pricing & site settings from Admin
  const [pricingConfig, setPricingConfig] = useState<Record<string, PricingPlan>>({});
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(getSiteConfig());

  // Suggestions form state
  const [sugName, setSugName] = useState('');
  const [sugEmail, setSugEmail] = useState('');
  const [sugMessage, setSugMessage] = useState('');
  const [sugSuccess, setSugSuccess] = useState(false);

  const handleSendSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugName.trim() || !sugEmail.trim() || !sugMessage.trim()) return;

    // Save suggestion locally for Admin Panel
    addSiteSuggestion({
      name: sugName.trim(),
      email: sugEmail.trim(),
      message: sugMessage.trim()
    });

    // Open mailto link directed to configurable admin email
    const destination = siteConfig.contactEmail || 'fabianofreitasfoto@hotmail.com';
    const subject = encodeURIComponent(`Sugestão Saldo A2 - ${sugName.trim()}`);
    const body = encodeURIComponent(`Nome: ${sugName.trim()}\nE-mail: ${sugEmail.trim()}\n\nMensagem / Sugestão:\n${sugMessage.trim()}`);
    const mailtoUrl = `mailto:${destination}?subject=${subject}&body=${body}`;

    window.open(mailtoUrl, '_blank');

    setSugSuccess(true);
    setSugName('');
    setSugEmail('');
    setSugMessage('');

    setTimeout(() => setSugSuccess(false), 6000);
  };

  useEffect(() => {
    if (!loading && user) {
      navigate('/sistema', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setPricingConfig(getPricingConfig());
    setSiteConfig(getSiteConfig());
    fetchSiteConfigAsync().then((cfg) => {
      setSiteConfig(cfg);
    });
  }, []);

  // Auto-advance banner every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getEmbedUrl = (url?: string) => {
    if (!url) return 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const slides = [
    {
      title: (
        <>
          O Futuro das Finanças em{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 text-transparent bg-clip-text">
            Família Chegou.
          </span>
        </>
      ),
      subtitle: "Esqueça as planilhas chatas. Use sua voz, deixe a IA organizar seus gastos e tome decisões financeiras inteligentes junto com quem você ama.",
      image: siteConfig.banner1Image || "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1600"
    },
    {
      title: (
        <>
          Assuma o controle financeiro com{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 text-transparent bg-clip-text">
            Clareza e Inteligência.
          </span>
        </>
      ),
      subtitle: "Organize receitas, despesas, teto de gastos, metas e lançamentos automáticos por voz.",
      image: siteConfig.banner2Image || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1600"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-indigo-100 selection:text-indigo-900 transition-colors relative">

      {/* NAVIGATION BAR - TRANSPARENT OVER DARK BANNER */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3.5 cursor-pointer group shrink-0" onClick={() => scrollToSection('inicio')}>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden transition-transform group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800"></div>
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 2.5L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
                <text x="12" y="16.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">$</text>
              </svg>
            </div>
            <span className="font-black text-2xl sm:text-3xl tracking-tight text-white leading-none whitespace-nowrap">
              Saldo A<span className="text-indigo-400">2</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-10 text-sm font-extrabold text-white">
            <button onClick={() => scrollToSection('inicio')} className="hover:text-indigo-400 transition-colors uppercase tracking-wide">
              Início
            </button>
            <button onClick={() => scrollToSection('recursos')} className="hover:text-indigo-400 transition-colors uppercase tracking-wide">
              Recursos
            </button>
            <button onClick={() => scrollToSection('planos')} className="hover:text-indigo-400 transition-colors uppercase tracking-wide">
              Planos
            </button>
            <button onClick={() => scrollToSection('contato')} className="hover:text-indigo-400 transition-colors uppercase tracking-wide">
              Contato
            </button>
          </div>

          {/* Header Action Button - Apenas o botão Entrar sozinho no canto */}
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/login')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
            >
              Entrar
            </button>
          </div>

        </div>
      </nav>

      {/* HERO SECTION / FULL BANNER SLIDER (#inicio) */}
      <section id="inicio" className="pt-20 relative overflow-hidden bg-slate-950">
        
        {/* Full-width Banner Container */}
        <div className="relative min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] w-full flex items-center justify-center">
          
          {/* Banner Images Carousel */}
          {slides.map((slide, idx) => (
            <div 
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img 
                src={slide.image} 
                alt="Finanças em Família Saldo A2"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              {/* Dark Gradient Overlay for optimal title legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50"></div>
            </div>
          ))}

          {/* Hero Banner Text Content (Layered over photo) */}
          <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 text-center py-16 space-y-8">
            
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white max-w-4xl mx-auto drop-shadow-md">
              {slides[currentSlide].title}
            </h1>

            <p className="text-base sm:text-xl text-slate-200 font-medium leading-relaxed max-w-3xl mx-auto drop-shadow-sm">
              {slides[currentSlide].subtitle}
            </p>

            {/* Single Action Button & Single Guarantee Phrase */}
            <div className="pt-4 flex flex-col items-center gap-4">
              <button 
                onClick={() => navigate('/login?signup=true')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-9 py-4 rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl shadow-indigo-950/80 flex items-center gap-3 group"
              >
                Teste grátis por 7 dias
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Sem necessidade de cartão de crédito para testar
              </p>
            </div>

          </div>

          {/* Slider Indicators (Dots only, without arrows) */}
          <div className="absolute bottom-6 z-30 flex items-center justify-center gap-3 w-full">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === currentSlide ? 'w-8 bg-indigo-500' : 'w-2.5 bg-white/40 hover:bg-white'
                }`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* RECURSOS E VANTAGENS (#recursos) */}
      <section id="recursos" className="py-20 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5" />
              Recursos Principais
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Tudo o que você precisa para uma gestão financeira eficiente e sem estresse.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Conheça as ferramentas desenvolvidas sob medida para simplificar o controle diário e garantir previsibilidade orçamentária.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1: Lançamento por Voz */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={siteConfig.featureVoiceImage || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=800"} 
                  alt="Lançamento por voz" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
                  <Mic className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Automação Inteligente</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Lançamento por Voz</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2">
                    Diga em áudio o valor e a descrição (ex: "Gastei 45 no mercado"). A IA A2Bot identifica a categoria, valor e conta bancária automaticamente.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 mr-1 text-emerald-500" /> Sem digitação manual exaustiva
                </div>
              </div>
            </div>

            {/* Feature 2: Modo Casal */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={siteConfig.featureCoupleImage || "https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?auto=format&fit=crop&q=80&w=800"} 
                  alt="Modo casal sincronizado" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-rose-500 text-white p-2.5 rounded-xl shadow-lg">
                  <Heart className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Gestão Compartilhada</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Modo Casal Sincronizado</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2">
                    Vincule a conta do seu parceiro(a). Alterne facilmente entre a sua visão individual e o orçamento conjunto, mantendo total transparência e harmonia.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 mr-1 text-emerald-500" /> Saiba para onde está indo seu dinheiro
                </div>
              </div>
            </div>

            {/* Feature 3: Teto de Gastos */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={siteConfig.featureLimitImage || "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800"} 
                  alt="Teto de gastos por categoria" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-amber-500 text-white p-2.5 rounded-xl shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Controle de Limites</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Teto de Gastos por Categoria</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2">
                    Defina limites mensais para alimentação, lazer e transporte. O sistema exibe barras de progresso visuais e avisa quando o orçamento estiver próximo do teto.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 mr-1 text-emerald-500" /> Previsibilidade orçamentária
                </div>
              </div>
            </div>

            {/* Feature 4: Metas */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={siteConfig.featureGoalsImage || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800"} 
                  alt="Metas e projetos do casal" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Conquistas & Projetos</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Metas e Projetos do Casal</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2">
                    Crie metas para viagens, reserva de emergência ou casa própria. Registre cada depósito e acompanhe a evolução percentual em direção aos seus sonhos.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 mr-1 text-emerald-500" /> Planejamento de viagens e sonhos
                </div>
              </div>
            </div>

            {/* Feature 5: Gráficos e Relatórios */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden bg-slate-900">
                <img 
                  src={siteConfig.featureChartsImage || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800"} 
                  alt="Gráficos e relatórios" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white p-2.5 rounded-xl shadow-lg">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Visão Analítica</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Gráficos e Relatórios</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2">
                    Gráficos interativos sincronizados em tempo real. Acompanhe a evolução do seu dinheiro e entenda para onde vai cada centavo.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 mr-1 text-emerald-500" /> Precisão total por categoria
                </div>
              </div>
            </div>

            {/* Feature 6: Extrato Inteligente */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={siteConfig.featureExtractImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"} 
                  alt="Extrato inteligente" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-purple-600 text-white p-2.5 rounded-xl shadow-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Organização Rápida</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Extrato Inteligente & Filtros</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2">
                    Visualize lançamentos em tabela limpa no computador ou em formato ultra compacto no smartphone. Busque facilmente por palavra-chave e altere status.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 mr-1 text-emerald-500" /> Design 100% otimizado para celular
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* VÍDEO DEMONSTRATIVO DO SISTEMA (PLAYER DIRETO NO SITE) */}
      <section className="py-20 px-4 sm:px-6 bg-slate-100 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-5xl mx-auto space-y-10 text-center">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
              <Play className="w-3.5 h-3.5 fill-current" />
              Vídeo Demonstrativo
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Veja o Saldo A2 em ação
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
              Descubra como é fácil utilizar o sistema e controlar suas finanças. Tenha domínio total do seu dinheiro.
            </p>
          </div>

          {/* Video Player Embedded Directly */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-black aspect-video max-w-4xl mx-auto">
            <iframe 
              src={getEmbedUrl(siteConfig.youtubeVideoUrl)} 
              title="Demonstração Saldo A2"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>

        </div>
      </section>

      {/* SEÇÃO PLANOS E PREÇOS (#planos) */}
      <section id="planos" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
              <Wallet className="w-3.5 h-3.5" />
              Planos & Assinaturas
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Escolha o plano ideal para suas metas
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Transparência total. Comece no plano gratuito e evolua de acordo com a necessidade do casal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-7xl mx-auto">
            
            {/* Loop dynamically through pricingConfig from admin settings */}
            {Object.entries(pricingConfig).map(([key, plan]) => {
              // SOMENTE O PLANO MÉDIO FICA COM A COR PREENCHIDA (HIGHLIGHT)
              const isHighlight = key === 'medio';
              
              return (
                <div 
                  key={key}
                  className={`p-7 rounded-3xl flex flex-col justify-between space-y-6 transition-all ${
                    isHighlight
                      ? 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-xl relative scale-102'
                      : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {isHighlight && (
                      <span className="inline-block bg-amber-400 text-slate-950 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-1">
                        Mais Popular entre Casais
                      </span>
                    )}

                    <div>
                      <h3 className={`text-xl font-black ${isHighlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        Plano {plan.name}
                      </h3>
                      <p className={`text-xs mt-1 font-medium ${isHighlight ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {plan.description}
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <span className="text-3xl font-black">
                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                      </span>
                      {plan.price > 0 && (
                        <span className={`text-xs font-bold ml-1 ${isHighlight ? 'text-indigo-200' : 'text-slate-400'}`}>
                          / mês
                        </span>
                      )}
                    </div>

                    <div className={`pt-4 border-t space-y-2 text-xs font-medium ${isHighlight ? 'border-indigo-500/60 text-indigo-50' : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isHighlight ? 'text-amber-300' : 'text-emerald-500'}`} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate('/login?signup=true')}
                    className={`w-full py-3.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all ${
                      isHighlight
                        ? 'bg-white hover:bg-slate-100 text-indigo-900 shadow-md'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                    }`}
                  >
                    {plan.price === 0 ? 'Cadastrar Grátis' : 'Assinar Agora'}
                  </button>
                </div>
              );
            })}

          </div>

        </div>
      </section>

      {/* CONTATO & SUGESTÕES (#contato) */}
      <section id="contato" className="py-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          
          {/* LADO ESQUERDO: CAIXA DE ENVIO DE SUGESTÕES */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-5 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">
                <MessageSquare className="w-3.5 h-3.5" />
                Envie suas Sugestões
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sua opinião é fundamental
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Quer ver uma nova funcionalidade no Saldo A2? Tem alguma dúvida ou comentário? Envie abaixo:
              </p>
            </div>

            {sugSuccess ? (
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 font-black text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Sugestão Enviada com Sucesso!
                </div>
                <p>
                  Obrigado por contribuir! Sua mensagem foi registrada para o nosso e-mail e nossa equipe analisará com carinho.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSuggestion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Seu Nome *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={sugName}
                      onChange={(e) => setSugName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Seu E-mail *
                    </label>
                    <input 
                      type="email" 
                      required
                      value={sugEmail}
                      onChange={(e) => setSugEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Comentário ou Sugestão *
                  </label>
                  <textarea 
                    rows={4}
                    required
                    value={sugMessage}
                    onChange={(e) => setSugMessage(e.target.value)}
                    placeholder="Escreva aqui sua ideia, comentário ou melhoria para o sistema..."
                    className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar Sugestão
                </button>
              </form>
            )}
          </div>

          {/* LADO DIREITO: FALE CONOSCO (WHATSAPP) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900/10 via-slate-50 to-emerald-900/5 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-6 sm:p-8 rounded-3xl border border-emerald-200/50 dark:border-emerald-900/30 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                <MessageCircle className="w-3.5 h-3.5" />
                Atendimento Rápido
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Fale conosco
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Prefere conversar diretamente com a nossa equipe em tempo real? Clique abaixo para abrir um atendimento exclusivo no WhatsApp.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-xs">Atendimento Comercial & Suporte</h3>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Equipe Online
                  </p>
                </div>
              </div>

              <a 
                href={`https://wa.me/${siteConfig.whatsappNumber || '5511999999999'}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/20"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                Conversar no WhatsApp
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER - Com Redes Sociais no lugar de Jurídico/LGPD */}
      <footer className="py-16 border-t border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 bg-slate-100 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          
          {/* Logo e Descrição */}
          <div>
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L12 2.5L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
                  <text x="12" y="16.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">$</text>
                </svg>
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Saldo A<span className="text-indigo-600 dark:text-indigo-400">2</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium">
              Plataforma de gestão financeira pessoal e para casais com inteligência artificial, lançamentos por voz e controle orçamentário.
            </p>
          </div>

          {/* Links e Redes Sociais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-xs w-full md:w-auto">
            
            {/* Navegação */}
            <div>
              <h4 className="font-black uppercase tracking-widest text-slate-400 mb-3 text-[10px]">Navegação</h4>
              <ul className="space-y-2 font-medium text-slate-600 dark:text-slate-400">
                <li><button onClick={() => scrollToSection('inicio')} className="hover:text-indigo-600">Início</button></li>
                <li><button onClick={() => scrollToSection('recursos')} className="hover:text-indigo-600">Recursos</button></li>
                <li><button onClick={() => scrollToSection('planos')} className="hover:text-indigo-600">Planos</button></li>
                <li><button onClick={() => scrollToSection('contato')} className="hover:text-indigo-600">Contato</button></li>
              </ul>
            </div>

            {/* Redes Sociais (Dinâmicas configuráveis no admin) */}
            <div>
              <h4 className="font-black uppercase tracking-widest text-slate-400 mb-3 text-[10px]">Redes Sociais</h4>
              <ul className="space-y-2.5 font-medium text-slate-600 dark:text-slate-400">
                <li>
                  <a href={siteConfig.instagramUrl || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" /> Instagram
                  </a>
                </li>
                <li>
                  <a href={siteConfig.facebookUrl || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                  </a>
                </li>
                <li>
                  <a href={siteConfig.youtubeChannelUrl || 'https://youtube.com'} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" /> YouTube
                  </a>
                </li>
                <li>
                  <a href={siteConfig.linkedinUrl || 'https://linkedin.com'} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-500" /> LinkedIn
                  </a>
                </li>
              </ul>
            </div>

            {/* Acesso Rápido */}
            <div>
              <h4 className="font-black uppercase tracking-widest text-slate-400 mb-3 text-[10px]">Acesso Rápido</h4>
              <ul className="space-y-2 font-medium text-slate-600 dark:text-slate-400">
                <li><button onClick={() => navigate('/login')} className="hover:text-indigo-600">Entrar na Conta</button></li>
                <li><button onClick={() => navigate('/login?signup=true')} className="hover:text-indigo-600">Criar Nova Conta</button></li>
              </ul>
            </div>

          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 Saldo A2 SaaS. Todos os direitos reservados.</span>
          <span>Desenvolvido com foco na saúde financeira das famílias.</span>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
