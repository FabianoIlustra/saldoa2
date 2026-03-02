
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, Mail, Lock, User as UserIcon, Loader2, ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
  onGuestLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onGuestLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              avatar_color: '#6366f1', // Default color
            },
          },
        });
        if (error) throw error;
      }
      onLogin();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row font-sans">
      {/* Left Side - Hero/Visual */}
      <div className="lg:w-1/2 bg-indigo-600 relative overflow-hidden flex flex-col justify-between p-12 lg:p-20 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-purple-900/90"></div>
        
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 shadow-xl border border-white/10">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
            Finanças <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">Inteligentes</span>
          </h1>
          <p className="text-indigo-100 text-lg lg:text-xl max-w-md leading-relaxed opacity-90">
            Assuma o controle do seu futuro financeiro com o poder da inteligência artificial. Simples, rápido e seguro.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <Sparkles className="w-6 h-6 mb-3 text-indigo-300" />
            <h3 className="font-bold mb-1">IA Integrada</h3>
            <p className="text-xs text-indigo-200">Consultoria personalizada 24/7</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <ShieldCheck className="w-6 h-6 mb-3 text-emerald-300" />
            <h3 className="font-bold mb-1">100% Seguro</h3>
            <p className="text-xs text-indigo-200">Seus dados protegidos</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <Zap className="w-6 h-6 mb-3 text-amber-300" />
            <h3 className="font-bold mb-1">Em Tempo Real</h3>
            <p className="text-xs text-indigo-200">Sincronização instantânea</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-20 bg-white dark:bg-slate-950">
        <div className="max-w-md w-full">
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {isLogin ? 'Entre com suas credenciais para acessar.' : 'Preencha os dados abaixo para começar.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isLogin ? 'Entrar na Conta' : 'Criar Conta Grátis'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
            <span className="text-xs font-bold text-slate-400 uppercase">Ou</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={onGuestLogin}
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center justify-center gap-2 group"
            >
              Entrar como Convidado
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>

            <p className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
