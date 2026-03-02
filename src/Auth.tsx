import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { LogIn, AlertTriangle, User, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase';

const Auth: React.FC = () => {
  const { signInWithGoogle, signInAsGuest } = useAuth();

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100 dark:border-slate-700">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Configuração Necessária</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Para usar o Saldo A2, você precisa conectar seu projeto Supabase.
          </p>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-left text-sm text-slate-600 dark:text-slate-300 mb-6 border border-slate-200 dark:border-slate-700">
            <p className="font-bold mb-2">Adicione as variáveis de ambiente:</p>
            <code className="block bg-slate-200 dark:bg-slate-950 p-2 rounded mb-2 overflow-x-auto font-mono text-xs">VITE_SUPABASE_URL</code>
            <code className="block bg-slate-200 dark:bg-slate-950 p-2 rounded overflow-x-auto font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>
          </div>
          <button 
            onClick={signInAsGuest}
            className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Entrar como Visitante (Demo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Left Side - Hero & Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-purple-700/90"></div>
        
        <div className="relative z-10 text-white max-w-lg">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight">
            Finanças a dois, <br/>
            <span className="text-indigo-200">simplificadas.</span>
          </h1>
          <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
            O único app que combina sincronização em tempo real com a inteligência do Gemini AI para ajudar casais a prosperarem juntos.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5">
              <div className="p-2 bg-indigo-500/30 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-bold text-white">Privacidade Total</h3>
                <p className="text-indigo-200 text-sm">Seus dados são criptografados e seguros.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-slate-500 dark:text-slate-400">Entre para acessar seu painel financeiro.</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={signInWithGoogle}
              className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md group"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google" />
              <span>Continuar com Google</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-50 dark:bg-slate-950 text-slate-400">ou teste sem compromisso</span>
              </div>
            </div>

            <button 
              onClick={signInAsGuest}
              className="w-full bg-slate-200 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="w-5 h-5" />
              Entrar como Visitante
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
            <br/>
            Se o login com Google falhar, verifique se o provedor está habilitado no Supabase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
