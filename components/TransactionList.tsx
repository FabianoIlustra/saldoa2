
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Transaction, User, Account, Category } from '../types';
import { Trash2, Search, ShoppingCart, Home, Car, Utensils, Heart, Briefcase, GraduationCap, Repeat, User as UserIcon, Filter, ArrowUpCircle, ArrowDownCircle, Wallet, Printer, Upload, Edit2, Tag } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterBar, { FilterState } from './FilterBar';

interface TransactionListProps {
  transactions: Transaction[];
  users: User[];
  accounts: Account[];
  categories: Category[];
  onDelete: (id: string) => void;
  onOpenImporter: () => void;
  onEdit?: (transaction: Transaction) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Alimentação': return <Utensils className="w-4 h-4" />;
    case 'Moradia': return <Home className="w-4 h-4" />;
    case 'Transporte': return <Car className="w-4 h-4" />;
    case 'Lazer': return <ShoppingCart className="w-4 h-4" />;
    case 'Saúde': return <Heart className="w-4 h-4" />;
    case 'Educação': return <GraduationCap className="w-4 h-4" />;
    case 'Investimentos': return <Briefcase className="w-4 h-4" />;
    case 'Salário': return <Tag className="w-4 h-4" />;
    default: return <Tag className="w-4 h-4" />;
  }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, users, accounts, categories, onDelete, onOpenImporter, onEdit }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'createdAt' | 'userName' | 'accountName'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleSort = (key: keyof Transaction | 'createdAt' | 'userName' | 'accountName') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredTransactions = useMemo(() => {
    if (!currentFilters) return transactions;

    let result = transactions.filter(t => {
        // Search
        const matchesSearch = t.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                             t.category.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());
        
        // Type
        const matchesType = currentFilters.type === 'ALL' || t.type === currentFilters.type;
        
        // Categories (Multi-select)
        const matchesCategory = currentFilters.categories.length === 0 || currentFilters.categories.includes(t.category);
        
        // Accounts (Multi-select)
        const matchesAccount = currentFilters.accounts.length === 0 || currentFilters.accounts.includes(t.accountId);
        
        // Date Range
        const tDate = parseISO(t.date);
        const matchesDate = !currentFilters.dateRange.start || !currentFilters.dateRange.end || (
            tDate >= parseISO(currentFilters.dateRange.start) && 
            tDate <= parseISO(currentFilters.dateRange.end)
        );

        return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesDate;
    });

    // Sorting
    return result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Transaction];
        let bValue: any = b[sortConfig.key as keyof Transaction];

        if (sortConfig.key === 'userName') {
            aValue = users.find(u => u.id === a.userId)?.name || '';
            bValue = users.find(u => u.id === b.userId)?.name || '';
        } else if (sortConfig.key === 'accountName') {
            aValue = accounts.find(acc => acc.id === a.accountId)?.name || '';
            bValue = accounts.find(acc => acc.id === b.accountId)?.name || '';
        } else if (sortConfig.key === 'createdAt') {
            aValue = a.createdAt || a.date;
            bValue = b.createdAt || b.date;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [transactions, currentFilters, sortConfig, users, accounts]);

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
    
    // Fix floating point precision
    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      total: Math.round((income - expense) * 100) / 100
    };
  }, [filteredTransactions]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handlePrintAction = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Financeiro</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            .header { margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; }
            .header p { margin: 8px 0 0; color: #64748b; font-size: 14px; }
            
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
            td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            tr:last-child td { border-bottom: none; }
            
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .text-emerald { color: #059669; }
            .text-rose { color: #e11d48; }
            .text-slate { color: #64748b; }
            
            .totals { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
            .total-row { display: flex; justify-content: space-between; width: 300px; font-size: 14px; }
            .total-row.final { font-size: 18px; font-weight: 900; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Financeiro</h1>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Data Lanç.</th>
                <th>Data Real.</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Usuário</th>
                <th>Conta</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr>
                  <td class="text-slate">${t.createdAt ? format(parseISO(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</td>
                  <td class="text-slate">${format(parseISO(t.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td class="font-bold">${t.description}</td>
                  <td class="text-slate">${t.category}</td>
                  <td class="text-slate">${users.find(u => u.id === t.userId)?.name || 'Desconhecido'}</td>
                  <td class="text-slate">${accounts.find(a => a.id === t.accountId)?.name || '-'}</td>
                  <td class="text-right font-bold ${t.type === 'INCOME' ? 'text-emerald' : 'text-rose'}">
                    ${t.type === 'INCOME' ? '+' : '-'} ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
             <div class="total-row">
                <span class="text-slate font-bold uppercase text-xs">Total Receitas</span>
                <span class="text-emerald font-bold">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}</span>
             </div>
             <div class="total-row">
                <span class="text-slate font-bold uppercase text-xs">Total Despesas</span>
                <span class="text-rose font-bold">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}</span>
             </div>
             <div class="total-row final">
                <span>Saldo Final</span>
                <span class="${totals.total >= 0 ? 'text-emerald' : 'text-rose'}">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span>
             </div>
          </div>

          <script>
            // Wait for styles to load then print
            window.onload = function() {
              setTimeout(function() {
                window.print();
                // Optional: close after print
                // window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getUserColor = (userId: string) => {
    return users.find(u => u.id === userId)?.avatarColor || '#cbd5e1';
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Conta';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print:space-y-0">
      
      <div className="print:hidden">
        <FilterBar 
          categories={categories}
          accounts={accounts}
          onFilterChange={setCurrentFilters}
          onPrint={handlePrint}
          showPrint={true}
        />
      </div>

      {/* Import Button (Mobile/Desktop) - Hidden on Print */}
      <div className="flex justify-end print:hidden gap-2">
         <button 
            onClick={onOpenImporter}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Extrato</span>
          </button>
      </div>

      {/* Tabela de Transações */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 print:shadow-none print:border-none print:overflow-visible">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <th onClick={() => handleSort('createdAt')} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap">
                        Data Lançamento {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('date')} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap">
                        Data Realizado {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('category')} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap">
                        Categoria {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('userName')} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap">
                        Usuário {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('accountName')} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap">
                        Banco {sortConfig.key === 'accountName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('amount')} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap text-right">
                        Valor {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right print:hidden">
                        Ações
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.length === 0 ? (
                    <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Nenhum resultado encontrado
                        </td>
                    </tr>
                ) : (
                    filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {t.createdAt ? format(parseISO(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {format(parseISO(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                <span className="flex items-center gap-2">
                                    {getCategoryIcon(t.category)}
                                    {t.category}
                                </span>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getUserColor(t.userId) }} />
                                    {users.find(u => u.id === t.userId)?.name || 'Desconhecido'}
                                </div>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {getAccountName(t.accountId)}
                            </td>
                            <td className={`p-4 text-xs font-black text-right whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {t.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                            </td>
                            <td className="p-4 text-right print:hidden">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onEdit && (
                                        <button 
                                            onClick={() => onEdit(t)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => onDelete(t.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

      {/* Footer Totals */}
      <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 p-4 md:p-6 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] print:static print:shadow-none print:border-t-2 print:border-black">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
           <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Receitas</p>
              <p className="text-emerald-500 font-black text-sm md:text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}</p>
           </div>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
           <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Despesas</p>
              <p className="text-rose-500 font-black text-sm md:text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}</p>
           </div>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
           <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo</p>
              <p className={`font-black text-sm md:text-xl ${totals.total >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}
              </p>
           </div>
        </div>
      </div>

      {isPrintModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] bg-white dark:bg-slate-900 overflow-auto print-modal">
          <style>{`
            @media print {
              /* Hide everything in body */
              body > * {
                display: none !important;
              }
              /* Show the modal (which is a direct child of body due to portal) */
              body > .print-modal {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
                z-index: 99999 !important;
                background: white !important;
              }
              /* Ensure html/body allow scrolling/full height */
              html, body {
                height: auto !important;
                overflow: visible !important;
                background: white !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .print\\:block {
                display: block !important;
              }
            }
          `}</style>
          <div className="p-8 max-w-4xl mx-auto print:max-w-none print:p-0">
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Relatório de Transações</h2>
                <div className="flex gap-4">
                    <button onClick={() => setIsPrintModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Fechar</button>
                    <button type="button" onClick={handlePrintAction} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all cursor-pointer">
                        <Printer className="w-5 h-5" /> Imprimir
                    </button>
                </div>
            </div>
            
            <div className="print:block">
                <div className="mb-8 hidden print:block">
                    <h1 className="text-2xl font-black mb-2">Relatório Financeiro</h1>
                    <p className="text-sm text-slate-500">Gerado em {new Date().toLocaleDateString()}</p>
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            <th className="p-3 text-xs font-black uppercase text-slate-500">Data Lanç.</th>
                            <th className="p-3 text-xs font-black uppercase text-slate-500">Data Real.</th>
                            <th className="p-3 text-xs font-black uppercase text-slate-500">Descrição</th>
                            <th className="p-3 text-xs font-black uppercase text-slate-500">Categoria</th>
                            <th className="p-3 text-xs font-black uppercase text-slate-500">Usuário</th>
                            <th className="p-3 text-xs font-black uppercase text-slate-500">Conta</th>
                            <th className="p-3 text-xs font-black uppercase text-slate-500 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTransactions.map((t) => (
                            <tr key={t.id}>
                                <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{t.createdAt ? format(parseISO(t.createdAt), 'dd/MM/yyyy HH:mm') : '-'}</td>
                                <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                                <td className="p-3 text-xs font-bold text-slate-900 dark:text-white">{t.description}</td>
                                <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{t.category}</td>
                                <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{users.find(u => u.id === t.userId)?.name || 'Desconhecido'}</td>
                                <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{accounts.find(a => a.id === t.accountId)?.name}</td>
                                <td className={`p-3 text-xs font-bold text-right ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                        <tr>
                            <td colSpan={6} className="p-3 text-right text-slate-900 dark:text-white">Total Receitas:</td>
                            <td className="p-3 text-right text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="p-3 text-right text-slate-900 dark:text-white">Total Despesas:</td>
                            <td className="p-3 text-right text-rose-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="p-3 text-right text-slate-900 dark:text-white">Saldo Final:</td>
                            <td className={`p-3 text-right ${totals.total >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransactionList;
