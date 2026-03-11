
// Force sync
import React, { useState } from 'react';
import { User } from '../types';
import { Plus, User as UserIcon, Wallet } from 'lucide-react';

interface UserSelectorProps {
  users: User[];
  onSelect: (user: User) => void;
  onCreate: (name: string) => void;
}

const UserSelector: React.FC<UserSelectorProps> = ({ users, onSelect, onCreate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 z-[60] transition-colors">
      <div className="max-w-4xl w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <Wallet className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Quem está economizando hoje?</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-12 text-lg font-medium">Selecione seu perfil para acessar o Saldo A2.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelect(user)}
              className="group flex flex-col items-center gap-4 transition-all hover:scale-110"
            >
              <div 
                className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-lg transition-all group-hover:ring-4 group-hover:ring-indigo-500 group-hover:shadow-indigo-200 dark:group-hover:shadow-none`}
                style={{ backgroundColor: user.avatarColor }}
              >
                <UserIcon className="w-12 h-12 text-white/90" />
              </div>
              <span className="text-slate-600 dark:text-slate-300 font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.name}</span>
            </button>
          ))}

          <button
            onClick={() => setShowAddForm(true)}
            className="group flex flex-col items-center gap-4 transition-all hover:scale-110"
          >
            <div className="w-24 h-24 rounded-[2rem] border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all group-hover:border-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20">
              <Plus className="w-10 h-10 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500" />
            </div>
            <span className="text-slate-400 dark:text-slate-600 font-bold group-hover:text-indigo-500">Novo Perfil</span>
          </button>
        </div>

        {showAddForm && (
          <div className="mt-12 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 max-w-md mx-auto animate-in fade-in slide-in-from-top-4 shadow-xl transition-colors">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Criar novo perfil</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="Nome (ex: Esposa, João...)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white px-6 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder-slate-400 dark:placeholder-slate-500 transition-all"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl text-slate-400 dark:text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSelector;
