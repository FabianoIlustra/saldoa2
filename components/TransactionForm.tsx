
import React, { useState } from 'react';
import { Category, TransactionType, RecurrenceType, User, Account } from '../types';
import { X, Plus, Repeat, User as UserIcon, Check, CreditCard } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  users: User[];
  accounts: Account[];
  currentUser: User;
  onAdd: (transaction: {
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
    recurrence: RecurrenceType;
    userId: string;
    accountId: string;
    isJoint?: boolean;
  }) => void;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ categories, users, accounts, currentUser, onAdd, onClose }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState(categories[0]?.name || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('NONE');
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [isJoint, setIsJoint] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !selectedAccountId) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      type,
      category,
      date,
      recurrence,
      userId: selectedUserId,
      accountId: selectedAccountId,
      isJoint
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10 dark:border-slate-800">
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Novo Lançamento</h2>
            <p className="text-indigo-100 text-xs opacity-80">Preencha os detalhes da transação</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Seletor de Conta - NOVIDADE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Vincular a qual conta?</label>
            <div className="relative">
              <select 
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                required
                className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold transition-all"
              >
                <option value="" disabled>Selecione uma conta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                ))}
              </select>
              <CreditCard className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
             <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id="isJoint" 
                  checked={isJoint} 
                  onChange={e => setIsJoint(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 dark:border-slate-600"
                />
                <Check className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
             </div>
             <label htmlFor="isJoint" className="cursor-pointer select-none text-sm font-bold text-slate-700 dark:text-slate-300">
                Lançamento Conjunto
             </label>
          </div>

          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${type === 'INCOME' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${type === 'EXPENSE' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}
            >
              Despesa
            </button>
          </div>

          <div className="space-y-4">
            <input
              required
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium placeholder-slate-400"
              placeholder="O que você comprou ou recebeu?"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                required
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                placeholder="Valor R$ 0,00"
              />
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl"
          >
            Confirmar Lançamento
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
