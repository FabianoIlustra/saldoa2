import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { recordUserSiteAccess } from '../services/accessTracker';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token');
    }
    return false;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user?.id) {
        recordUserSiteAccess(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (session?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        recordUserSiteAccess(session.user.id);
      }
    });

    // Se o usuário alternar de aba e voltar após um tempo, registra novo acesso
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        recordUserSiteAccess(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isPasswordRecovery, setIsPasswordRecovery, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
