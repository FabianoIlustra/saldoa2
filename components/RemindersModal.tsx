import React from 'react';
import { X, Bell, Calendar, Check, AlertCircle, Banknote, Sparkles } from 'lucide-react';

interface ReminderItem {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description: string;
  amount: number;
  isRecurring: boolean;
  category: string;
  dueLabel?: 'Hoje' | 'Amanhã';
  dueDate?: string;
}

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: ReminderItem[];
}

const RemindersModal: React.FC<RemindersModalProps> = ({ isOpen, onClose, reminders }) => {
  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const todayCount = reminders.filter(r => r.dueLabel === 'Hoje').length;
  const tomorrowCount = reminders.filter(r => r.dueLabel === 'Amanhã').length;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-center text-amber-500 relative">
              <Bell className="w-5 h-5 animate-bounce" />
              {reminders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Lembretes de Vencimento</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Contas e recebimentos de Hoje e Amanhã</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {reminders.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  <span>Você possui </span>
                  {todayCount > 0 && (
                    <strong className="text-rose-600 dark:text-rose-400 font-black">{todayCount} para hoje</strong>
                  )}
                  {todayCount > 0 && tomorrowCount > 0 && <span> e </span>}
                  {tomorrowCount > 0 && (
                    <strong className="text-blue-600 dark:text-blue-400 font-black">{tomorrowCount} para amanhã</strong>
                  )}
                  <span>. Fique atento aos saldos e vencimentos!</span>
                </div>
              </div>

              <div className="space-y-2">
                {reminders.map((item) => {
                  const isToday = item.dueLabel === 'Hoje';
                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isToday 
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1 text-left min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isToday 
                              ? 'bg-rose-500 text-white shadow-2xs' 
                              : 'bg-indigo-600 text-white shadow-2xs'
                          }`}>
                            {item.dueLabel || 'Amanhã'}
                          </span>

                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                            item.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                            item.type === 'TRANSFER' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' :
                            'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            {item.type === 'INCOME' ? 'A Receber' : item.type === 'TRANSFER' ? 'Transferência' : 'A Pagar'}
                          </span>

                          {item.isRecurring && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                              Recorrente
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-xs text-slate-800 dark:text-white truncate mt-1">
                          {item.description}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">Categoria: {item.category}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-black text-xs sm:text-sm ${
                          item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Tudo em dia!</h4>
                <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  Não há nenhum pagamento ou recebimento pendente para hoje ou amanhã.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

export default RemindersModal;
