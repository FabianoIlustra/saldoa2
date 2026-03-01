import React, { useRef } from 'react';
import { Transaction, User, Account, Category } from '../types';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintPreviewModalProps {
  transactions: Transaction[];
  users: User[];
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ transactions, users, accounts, categories, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    
    if (printWindow) {
      const content = printRef.current.innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Relatório Financeiro</title>
            <meta charset="utf-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                @page { margin: 1cm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
              body { background: white; font-family: sans-serif; }
            </style>
          </head>
          <body class="p-8">
            ${content}
            <script>
              window.onload = function() {
                // Small delay to ensure styles are applied
                setTimeout(function() {
                  window.print();
                  // Optional: Close window after print (some browsers block this if not user-initiated)
                  // window.close(); 
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('Por favor, permita popups para imprimir.');
    }
  };

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'INCOME') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Printer className="w-6 h-6 text-indigo-600" />
              Visualização de Impressão
            </h2>
            <p className="text-sm text-slate-500">Verifique o extrato antes de imprimir</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
            <button 
              onClick={handlePrint}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Content (Printable) */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-8">
          
          <div ref={printRef} className="max-w-3xl mx-auto bg-white p-10 shadow-sm">
            
            {/* Report Header */}
            <div className="text-center mb-10 border-b-2 border-slate-100 pb-8">
              <h1 className="text-4xl font-black text-slate-900 mb-2">Relatório Financeiro</h1>
              <p className="text-slate-500">Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <p className="text-xs font-black uppercase text-emerald-600/70 mb-1">Receitas</p>
                <p className="text-2xl font-black text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}
                </p>
              </div>
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <p className="text-xs font-black uppercase text-rose-600/70 mb-1">Despesas</p>
                <p className="text-2xl font-black text-rose-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}
                </p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <p className="text-xs font-black uppercase text-indigo-600/70 mb-1">Saldo Líquido</p>
                <p className={`text-2xl font-black ${balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-3 text-xs font-black uppercase text-slate-400 w-24">Data</th>
                  <th className="py-3 text-xs font-black uppercase text-slate-400">Descrição</th>
                  <th className="py-3 text-xs font-black uppercase text-slate-400 w-32">Categoria</th>
                  <th className="py-3 text-xs font-black uppercase text-slate-400 text-right w-32">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <tr key={t.id} className="group">
                    <td className="py-3 text-sm text-slate-500 font-medium">
                      {format(new Date(t.date), 'dd/MM/yy')}
                    </td>
                    <td className="py-3 text-sm font-bold text-slate-800">
                      {t.description}
                      {t.isJoint && <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-wider">Conjunto</span>}
                    </td>
                    <td className="py-3 text-sm text-slate-500">
                      {t.category}
                    </td>
                    <td className={`py-3 text-sm font-black text-right ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Saldo A2 • Gestão Financeira Inteligente</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
