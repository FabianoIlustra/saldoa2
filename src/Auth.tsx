import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { LogIn } from 'lucide-react';

const Auth: React.FC = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Bem-vindo ao Saldo A2</h1>
        <p className="text-slate-500 mb-8">Faça login para acessar suas finanças.</p>
        
        <button 
          onClick={signInWithGoogle}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <LogIn className="w-5 h-5" />
          Entrar com Google
        </button>
      </div>
    </div>
  );
};

export default Auth;
