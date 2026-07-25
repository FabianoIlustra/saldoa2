import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2, FileText, X, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTermsText } from '../services/termsService';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Registration fields
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Auto detect ?signup=true in query string
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('signup') === 'true') {
      setIsSignUp(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!authLoading && user) {
      const from = (location.state as any)?.from?.pathname || "/sistema";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('finan_ai_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDescription = params.get('error_description');
      
      if (errorDescription) {
        setMessage({ 
          text: decodeURIComponent(errorDescription.replace(/\+/g, ' ')), 
          type: 'error' 
        });
      }
    }
  }, []);

  // Format CPF helper: 000.000.000-00
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(value);
  };

  // Format Phone helper: (00) 00000-0000
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setPhone(value);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Por favor, informe seu nome completo.');
        }
        if (!cpf.trim() || cpf.replace(/\D/g, '').length < 11) {
          throw new Error('Por favor, informe um CPF válido.');
        }
        if (!phone.trim()) {
          throw new Error('Por favor, informe seu celular/WhatsApp.');
        }
        if (!address.trim()) {
          throw new Error('Por favor, informe seu endereço completo.');
        }
        if (!termsAccepted) {
          throw new Error('Você deve ler e aceitar os Termos de Uso e Política de Privacidade para se cadastrar.');
        }

        const nowIso = new Date().toISOString();

        // 1. Sign Up in Supabase Auth
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName.trim(),
              full_name: fullName.trim(),
              cpf: cpf.trim(),
              phone: phone.trim(),
              address: address.trim(),
              terms_accepted: true,
              terms_accepted_at: nowIso,
              avatar_color: '#6366f1',
            },
          },
        });

        if (error) throw error;

        // Save local metadata fallback for immediate availability
        if (signUpData.user) {
          const userMeta = {
            id: signUpData.user.id,
            email,
            name: fullName.trim(),
            full_name: fullName.trim(),
            cpf: cpf.trim(),
            phone: phone.trim(),
            address: address.trim(),
            terms_accepted: true,
            terms_accepted_at: nowIso,
            created_at: nowIso,
          };
          localStorage.setItem(`saldo_a2_user_meta_${signUpData.user.id}`, JSON.stringify(userMeta));

          // Save list of created users locally so Admin can view even if RLS is restricted
          try {
            const existingLocals = JSON.parse(localStorage.getItem('saldo_a2_all_registered_users') || '[]');
            const filtered = existingLocals.filter((u: any) => u.id !== signUpData.user.id);
            filtered.push(userMeta);
            localStorage.setItem('saldo_a2_all_registered_users', JSON.stringify(filtered));
          } catch (err) {
            console.warn('Error updating local user list:', err);
          }

          // Try updating profiles row directly if user session is active or trigger created
          try {
            await supabase.from('profiles').upsert({
              id: signUpData.user.id,
              name: fullName.trim(),
              full_name: fullName.trim(),
              cpf: cpf.trim(),
              phone: phone.trim(),
              address: address.trim(),
              terms_accepted: true,
              terms_accepted_at: nowIso,
              email: email,
            }, { onConflict: 'id' });
          } catch (profileErr) {
            console.warn('Profile row update attempt during signup:', profileErr);
          }
        }

        setMessage({ 
          text: 'Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta ou faça login se a confirmação estiver desativada.', 
          type: 'success' 
        });

      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (rememberMe) {
          localStorage.setItem('finan_ai_saved_email', email);
        } else {
          localStorage.removeItem('finan_ai_saved_email');
        }

        const from = (location.state as any)?.from?.pathname || "/sistema";
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'Ocorreu um erro no acesso.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const termsText = getTermsText();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 py-12 transition-colors">
      <div className={`bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl w-full ${isSignUp ? 'max-w-xl' : 'max-w-md'} border border-slate-200 dark:border-slate-800 transition-all`}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 2.5L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
              <text x="12" y="16.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">$</text>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isSignUp ? (
              <>Criar Nova Conta no Saldo A<span className="text-indigo-600 dark:text-indigo-400">2</span></>
            ) : (
              <>Bem-vindo de volta ao Saldo A<span className="text-indigo-600 dark:text-indigo-400">2</span></>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isSignUp ? 'Preencha seus dados cadastrais para começar' : 'Acesse seu painel financeiro familiar'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Registration Fields */}
          {isSignUp && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Dados do Titular da Conta
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nome e Sobrenome"
                  required
                />
              </div>

              {/* CPF e Celular Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                    CPF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Celular / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Endereço Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
              E-mail <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
              Senha <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {!isSignUp && (
            <div className="flex items-center justify-between">
              <label htmlFor="remember-me" className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Lembrar do meu e-mail
              </label>
            </div>
          )}

          {/* Terms Acceptance Checkbox */}
          {isSignUp && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-200 font-medium leading-tight">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded shrink-0 cursor-pointer"
                />
                <span>
                  Declaro que li e concordo integralmente com os{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold underline hover:text-indigo-700"
                  >
                    Termos de Uso e Política de Privacidade
                  </button>.
                </span>
              </label>
            </div>
          )}

          {/* Messages */}
          {message && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-xs uppercase tracking-wider"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Aceitar Termos e Cadastrar' : 'Entrar na Conta')}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Ainda não tem conta? Clique aqui para criar'}
          </button>
        </div>

      </div>

      {/* TERMOS DE USO MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Termos de Uso e Política de Privacidade — Saldo A2</h3>
              </div>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-[11px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap select-text">
              {termsText}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <button
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Li e Aceito os Termos
              </button>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
