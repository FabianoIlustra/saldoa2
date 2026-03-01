
import React, { useState } from 'react';
import { Goal } from '../types';
import { Target, Plus, TrendingUp, Trophy, Pencil, Trash2, X, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalsTrackProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'userId'>) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

const GoalsTrack: React.FC<GoalsTrackProps> = ({ goals, onAddGoal, onUpdateAmount, onUpdateGoal, onDeleteGoal }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [initialAmount, setInitialAmount] = useState('');

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [addingValueGoal, setAddingValueGoal] = useState<Goal | null>(null);
  const [addValueAmount, setAddValueAmount] = useState('');
  const [viewingHistoryGoal, setViewingHistoryGoal] = useState<Goal | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;
    onAddGoal({
      name,
      targetAmount: parseFloat(target),
      currentAmount: parseFloat(initialAmount) || 0,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      history: parseFloat(initialAmount) > 0 ? [{ date: new Date().toISOString(), amount: parseFloat(initialAmount) }] : []
    });
    setName('');
    setTarget('');
    setInitialAmount('');
    setIsAdding(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      onUpdateGoal(editingGoal);
      setEditingGoal(null);
    }
  };

  const handleAddValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (addingValueGoal && addValueAmount) {
      const amount = parseFloat(addValueAmount);
      if (!isNaN(amount)) {
        const updatedGoal = {
            ...addingValueGoal,
            currentAmount: addingValueGoal.currentAmount + amount,
            history: [
                { date: new Date().toISOString(), amount },
                ...(addingValueGoal.history || [])
            ]
        };
        onUpdateGoal(updatedGoal);
        setAddingValueGoal(null);
        setAddValueAmount('');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-indigo-600 rounded-[2rem] p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-indigo-100 dark:shadow-none">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Reserva e Sonhos</h2>
            <p className="text-indigo-100 text-sm">Acompanhe o progresso dos seus maiores objetivos.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
        >
          {isAdding ? 'Fechar Painel' : <><Plus className="w-5 h-5" /> Nova Meta</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Objetivo</label>
            <input placeholder="Ex: Viagem para Europa" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="md:w-48">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Valor Alvo (R$)</label>
            <input type="number" placeholder="5000.00" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="md:w-48">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Valor Inicial (R$)</label>
            <input type="number" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} />
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 mt-auto shadow-lg shadow-indigo-200 dark:shadow-none">Criar Meta</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
              <Target className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Nenhuma meta ainda</h3>
            <p className="text-slate-400">Clique em "Nova Meta" para começar a planejar seu futuro.</p>
          </div>
        )}
        {goals.map(goal => {
          const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
          return (
            <div key={goal.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between h-full">
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: goal.color + '15', color: goal.color }}>
                  <Target className="w-6 h-6" />
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">{percent}%</span>
                   <div className="flex gap-1">
                      <button onClick={() => setViewingHistoryGoal(goal)} className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-indigo-600 transition-colors" title="Histórico">
                        <Clock className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingGoal(goal)} className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => onDeleteGoal(goal.id)} className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                   </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1 truncate" title={goal.name}>{goal.name}</h4>
                <p className="text-xs text-slate-400 mb-6 font-medium">Meta final: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.targetAmount)}</p>

                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.1)]" style={{ width: `${percent}%`, backgroundColor: goal.color }} />
                </div>
              </div>

              <div className="flex justify-between items-center mt-auto">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Acumulado</span>
                   <span className="font-bold text-slate-700 dark:text-slate-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.currentAmount)}</span>
                </div>
                <button 
                  onClick={() => setAddingValueGoal(goal)}
                  className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                  title="Adicionar valor"
                >
                  <TrendingUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Meta</h3>
              <button onClick={() => setEditingGoal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome</label>
                <input 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold" 
                  value={editingGoal.name} 
                  onChange={e => setEditingGoal({...editingGoal, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Valor Alvo (R$)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold" 
                  value={editingGoal.targetAmount} 
                  onChange={e => setEditingGoal({...editingGoal, targetAmount: parseFloat(e.target.value)})} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Valor Acumulado (R$)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold" 
                  value={editingGoal.currentAmount} 
                  onChange={e => setEditingGoal({...editingGoal, currentAmount: parseFloat(e.target.value)})} 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingGoal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Value Modal */}
      {addingValueGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Adicionar Valor</h3>
                <p className="text-xs text-slate-400">{addingValueGoal.name}</p>
              </div>
              <button onClick={() => setAddingValueGoal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddValue} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Valor a adicionar (R$)</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold text-lg" 
                  value={addValueAmount} 
                  onChange={e => setAddValueAmount(e.target.value)} 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setAddingValueGoal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {viewingHistoryGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Histórico de Aportes</h3>
                <p className="text-xs text-slate-400">{viewingHistoryGoal.name}</p>
              </div>
              <button onClick={() => setViewingHistoryGoal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
               {(!viewingHistoryGoal.history || viewingHistoryGoal.history.length === 0) ? (
                 <div className="text-center py-10 text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nenhum histórico registrado.</p>
                 </div>
               ) : (
                 viewingHistoryGoal.history.map((h, i) => (
                   <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-indigo-500">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {format(new Date(h.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="font-black text-emerald-500">
                        + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(h.amount)}
                      </span>
                   </div>
                 ))
               )}
            </div>
            
            <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setViewingHistoryGoal(null)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsTrack;
