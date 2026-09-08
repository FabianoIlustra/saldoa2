import { supabase } from './supabase';

// In-memory debounce lock to prevent duplicate calls when multiple components mount
let isTracking = false;
let lastRecordedTime = 0;

/**
 * Registra o acesso do usuário ao site, mesmo que ele já esteja logado.
 * 
 * Regra de contagem de acesso:
 * 1. Conta quando o usuário abre uma nova aba / sessão do navegador (sessionStorage).
 * 2. Conta quando o usuário retorna ao site após mais de 15 minutos de inatividade.
 * 3. Evita contagem duplicada em recarregamentos rápidos (F5) ou trocas de rota.
 */
export async function recordUserSiteAccess(userId: string, force = false): Promise<void> {
  if (!userId) return;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // Trava em memória para chamadas paralelas simultâneas (mesmo instante)
  if (isTracking && !force) return;

  const sessionKey = `finan_ai_session_access_${userId}`;
  const lastAccessTsKey = `finan_ai_last_access_ts_${userId}`;
  
  const hasSessionRecord = Boolean(sessionStorage.getItem(sessionKey));
  const lastRecordedTs = Number(localStorage.getItem(lastAccessTsKey) || '0');
  const minutesSinceLastAccess = (now - lastRecordedTs) / (1000 * 60);

  // Se já registrou nesta sessão e passaram menos de 15 minutos, não infla a contagem
  if (!force && hasSessionRecord && minutesSinceLastAccess < 15) {
    return;
  }

  // Previne chamadas em loop (mínimo 30 segundos entre gravações reais)
  if (!force && now - lastRecordedTime < 30000) {
    return;
  }

  isTracking = true;
  lastRecordedTime = now;

  try {
    // Marca na sessão atual e no localStorage
    sessionStorage.setItem(sessionKey, nowIso);
    localStorage.setItem(lastAccessTsKey, String(now));
    localStorage.setItem(`user_last_sign_in_${userId}`, nowIso);

    // 1. Tentar via RPC segura no banco Supabase
    let rpcSucceeded = false;
    try {
      const { error: rpcErr } = await supabase.rpc('record_user_access', { target_user_id: userId });
      if (!rpcErr) {
        rpcSucceeded = true;
      }
    } catch {
      rpcSucceeded = false;
    }

    // 2. Se a RPC falhar ou não existir ainda no banco, atualiza diretamente a tabela profiles
    if (!rpcSucceeded) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('login_count')
          .eq('id', userId)
          .single();

        const currentCount = Number(prof?.login_count || 0);
        const nextCount = currentCount + 1;

        await supabase
          .from('profiles')
          .update({
            last_sign_in_at: nowIso,
            login_count: nextCount
          })
          .eq('id', userId);

        localStorage.setItem(`user_login_count_${userId}`, String(nextCount));
      } catch (directUpdateErr) {
        // Fallback mínimo se a coluna login_count não existir
        try {
          await supabase
            .from('profiles')
            .update({ last_sign_in_at: nowIso })
            .eq('id', userId);
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Erro ao registrar acesso do usuário:', err);
  } finally {
    isTracking = false;
  }
}
