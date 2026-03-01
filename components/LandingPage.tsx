
import React from 'react';
import { Wallet, Sparkles, Heart, Mic, ShieldCheck, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter">FinanAI</span>
          </div>
          <button 
            onClick={onStart}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Entrar no App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-8 animate-bounce">
            <Sparkles className="w-4 h-4" />
            Controlado por Inteligência Artificial
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[1.1]">
            O Futuro das Finanças em <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">Casal</span> Chegou.
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Esqueça as planilhas chatas. Use sua voz, deixe a IA organizar seus gastos e tome decisões financeiras inteligentes junto com quem você ama.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 group"
            >
              Começar Agora Gratuitamente
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-sm font-bold text-slate-400">Sem cartão de crédito necessário</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-8 text-rose-500">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">Feito para Dois</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Sincronização em tempo real entre perfis. Veja quem gastou o quê e planeje metas conjuntas sem esforço.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-8 text-indigo-500">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">Voz & Automação</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Diga "Gastei 50 com pizza" e a IA categoriza tudo. Importe extratos inteiros em segundos com o Gemini.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-8 text-emerald-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">100% Privado</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Seus dados financeiros nunca saem do seu navegador. Segurança absoluta com armazenamento local persistente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Placeholder */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-12">Usado por milhares de casais inteligentes</h2>
        <div className="flex flex-wrap justify-center items-center gap-12 opacity-30 grayscale contrast-125">
          <div className="text-3xl font-black">CASAL PRO</div>
          <div className="text-3xl font-black italic">Finanza</div>
          <div className="text-3xl font-black">SaveWise</div>
          <div className="text-3xl font-black tracking-tighter">COUPLE.LY</div>
        </div>
      </section>

      {/* Pricing Tease */}
      <section className="py-20 px-6 bg-slate-900 text-white rounded-[4rem] mx-4 mb-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-20 opacity-10">
          <Zap className="w-64 h-64" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter">Pronto para transformar sua vida financeira?</h2>
          <p className="text-slate-400 text-lg mb-12 font-medium">Acesso vitalício ao código e ao app por um preço único promocional.</p>
          <button 
            onClick={onStart}
            className="bg-white text-indigo-900 px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all"
          >
            Acessar Versão Gratuita
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 dark:border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
             <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg tracking-tighter">FinanAI</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs">A plataforma de controle financeiro definitiva para a era da inteligência artificial.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-4">Produto</h4>
              <ul className="text-sm text-slate-500 space-y-2">
                <li>Funcionalidades</li>
                <li>Preços</li>
                <li>Roadmap</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-4">Jurídico</h4>
              <ul className="text-sm text-slate-500 space-y-2">
                <li>Termos de Uso</li>
                <li>Privacidade</li>
                <li>Cookies</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-4">Social</h4>
              <ul className="text-sm text-slate-500 space-y-2">
                <li>Instagram</li>
                <li>Twitter</li>
                <li>LinkedIn</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-50 dark:border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
          © 2024 FinanAI SaaS. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
