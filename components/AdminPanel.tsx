import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { 
  Users, ShieldCheck, DollarSign, Award, ArrowUpRight, Search, 
  Filter, Check, RefreshCw, Clipboard, Database, AlertCircle, TrendingUp
} from 'lucide-react';

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
      // Fallback or explain that SQL might need to be run
      setErrorState(err.message || 'Row Level Security (RLS) limitou a busca.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProfiles();
  }, []);

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

  // Projections
  const stats = React.useMemo(() => {
    const total = profiles.length;
    const gratis = profiles.filter(p => !p.tier || p.tier === 'gratis').length;
    const basico = profiles.filter(p => p.tier === 'basico').length;
    const medio = profiles.filter(p => p.tier === 'medio').length;
    const premium = profiles.filter(p => p.tier === 'premium').length;

    // Monthly Projected Revenue:
    // Basico: R$19,90, Medio: R$39,90, Premium: R$59,90
    const projectedRevenue = (basico * 19.9) + (medio * 39.9) + (premium * 59.9);

    return {
      total,
      gratis,
      basico,
      medio,
      premium,
      projectedRevenue
    };
  }, [profiles]);

  // Filtered profiles
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
    const sql = `-- Execute este comando no editor SQL do Supabase para atualizar as permissões do Admin:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'gratis';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

UPDATE public.profiles SET role = 'admin', tier = 'premium' WHERE id = '${currentUser.id}';`;
    navigator.clipboard.writeText(sql);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gerencie os acessos, libere testes e acompanhe o crescimento da sua base de assinantes.</p>
        </div>
        <button 
          onClick={fetchAllProfiles}
          className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs px-4 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Sincronizar
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
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{loading ? '...' : stats.total}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MRR Projetado</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {loading ? '...' : `R$ ${stats.projectedRevenue.toFixed(2)}`}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assinaturas Premium</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{loading ? '...' : stats.premium}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversão Ativa</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {loading ? '...' : `${stats.total > 0 ? (((stats.basico + stats.medio + stats.premium) / stats.total) * 100).toFixed(1) : 0}%`}
            </h3>
          </div>
        </div>
      </div>

      {/* RLS Policy Checker / Error Message Card */}
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
                <strong>Instrução:</strong> Abra o console do seu <strong>Supabase</strong>, vá na seção <strong>SQL Editor</strong>, crie uma nova query, cole o script que foi gerado no arquivo <code className="text-indigo-400">supabase-add-subscriptions.sql</code> na raiz do seu projeto e execute-o. Depois, clique em "Sincronizar" acima!
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

      {/* Main Table View */}
      {!errorState && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
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

                        {/* Tier Badge Selector */}
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                            role === 'admin'
                              ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {role}
                          </span>
                        </td>

                        {/* Couple Connection */}
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {p.couple_id ? (
                            <span className="text-emerald-500 font-semibold flex items-center gap-1">
                              ● Ativo
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Individual</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Change Access select */}
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

                            {/* Toggle admin select */}
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
    </div>
  );
};

export default AdminPanel;
