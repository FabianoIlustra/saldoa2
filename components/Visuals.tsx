
// Force sync
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid, LabelList } from 'recharts';
import { Transaction, Category, User, Account } from '../types';
import FilterBar, { FilterState } from './FilterBar';
import { isWithinInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpDown } from 'lucide-react';

interface VisualsProps {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  accounts: Account[]; // Added prop
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700 transition-colors">
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-0.5 tracking-widest">{label || payload[0].name}</p>
        {payload.map((p: any, i: number) => (
           <p key={i} className="text-xs font-black" style={{ color: p.color }}>
             {p.name}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
           </p>
        ))}
      </div>
    );
  }
  return null;
};

const Visuals: React.FC<VisualsProps> = ({ transactions, categories, users, accounts }) => {
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'category' | 'type' | 'value', direction: 'asc' | 'desc' } | null>(null);

  const filteredTransactions = useMemo(() => {
    if (!currentFilters) return transactions;

    return transactions.filter(t => {
        // Search
        const matchesSearch = t.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase()) || 
                             t.category.toLowerCase().includes(currentFilters.searchTerm.toLowerCase());
        
        // Type (Visuals usually show both, but if filtered, we respect it)
        const matchesType = currentFilters.type === 'ALL' || t.type === currentFilters.type;
        
        // Categories
        const matchesCategory = currentFilters.categories.length === 0 || currentFilters.categories.includes(t.category);
        
        // Accounts
        const matchesAccount = currentFilters.accounts.length === 0 || currentFilters.accounts.includes(t.accountId);
        
        // Date Range
        const tDate = parseISO(t.date);
        const matchesDate = isWithinInterval(tDate, {
           start: parseISO(currentFilters.dateRange.start),
           end: parseISO(currentFilters.dateRange.end)
        });

        return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesDate;
    });
  }, [transactions, currentFilters]);

  const categorySummary = useMemo(() => {
    const summary: Record<string, { category: string, type: string, value: number }> = {};
    
    filteredTransactions.forEach(t => {
      const key = `${t.category}-${t.type}`;
      if (!summary[key]) {
        summary[key] = { category: t.category, type: t.type, value: 0 };
      }
      summary[key].value += t.amount;
    });

    let result = Object.values(summary);

    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filteredTransactions, sortConfig]);

  const requestSort = (key: 'category' | 'type' | 'value') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalSummaryValue = categorySummary.reduce((sum, item) => sum + (item.type === 'INCOME' ? item.value : -item.value), 0);

  const expenseData = useMemo(() => {
    const data = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc: any[], t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);
    
    return data.slice(0, 5);
  }, [filteredTransactions]);

  const dailyFlow = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentBalance = 0;
    const history = sorted.reduce((acc: any[], t) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const change = t.type === 'INCOME' ? t.amount : -t.amount;
      currentBalance += change;
      
      const existing = acc.find(item => item.name === date);
      if (existing) {
        existing.saldo = currentBalance;
      } else {
        acc.push({ name: date, saldo: currentBalance });
      }
      return acc;
    }, []);

    return history.slice(-15); // Show last 15 data points of the filtered range
  }, [filteredTransactions]);

  const monthlyHistory = useMemo(() => {
     // Group by Month/Year
     const grouped = filteredTransactions.reduce((acc: any, t) => {
         const date = parseISO(t.date);
         const key = format(date, 'MMM/yy', { locale: ptBR });
         
         if (!acc[key]) acc[key] = { name: key, receitas: 0, despesas: 0 };
         
         if (t.type === 'INCOME') acc[key].receitas += t.amount;
         else acc[key].despesas += t.amount;
         
         return acc;
     }, {});

     return Object.values(grouped); // No sorting needed if we assume chronological input or sort keys
  }, [filteredTransactions]);

  const getCategoryColor = (name: string) => {
    return categories.find(c => c.name === name)?.color || '#6366f1';
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-20 animate-in fade-in duration-700">
      
      <FilterBar 
          categories={categories}
          accounts={accounts}
          onFilterChange={setCurrentFilters}
      />

      {/* Summary Table */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <header className="mb-8">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Resumo por Categoria</h3>
           <p className="text-xs text-slate-500 font-medium">Valores totais agrupados</p>
        </header>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('category')}>
                  <div className="flex items-center gap-2">Categoria <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('type')}>
                  <div className="flex items-center gap-2">Tipo <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('value')}>
                  <div className="flex items-center justify-end gap-2">Valor <ArrowUpDown className="w-3 h-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(item.category) }} />
                    {item.category}
                  </td>
                  <td className="py-3 px-4 text-xs font-bold">
                    <span className={`px-2 py-1 rounded-full text-[9px] uppercase tracking-wider ${item.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {item.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-50 dark:bg-slate-800/50">
                 <td colSpan={2} className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Total do Período</td>
                 <td className={`py-4 px-4 text-sm font-black text-right ${totalSummaryValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSummaryValue)}
                 </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Gastos */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <header className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Maiores Despesas</h3>
            <p className="text-xs text-slate-500 font-medium">Top 5 categorias do período</p>
          </header>
          
          <div className="h-[280px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={expenseData} 
                  innerRadius="65%" 
                  outerRadius="85%" 
                  paddingAngle={10} 
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {expenseData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Saldo */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <header className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Tendência de Saldo</h3>
            <p className="text-xs text-slate-500 font-medium">Evolução diária no período</p>
          </header>

          <div className="h-[280px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFlow}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                  strokeWidth={3}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Histórico Receitas vs Despesas (Novo Gráfico) */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
         <header className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Receitas vs Despesas</h3>
            <p className="text-xs text-slate-500 font-medium">Comparativo mensal</p>
          </header>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyHistory}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                   <Tooltip content={<CustomTooltip />} />
                   <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
                   <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="receitas" position="top" formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} />
                   </Bar>
                   <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="despesas" position="top" formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#ef4444' }} />
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

      {/* User Comparison Section */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">Participação de Gastos</h3>
        <div className="space-y-6">
          {/* Gastos Conjuntos */}
          {(() => {
              const jointExpenses = filteredTransactions
                  .filter(t => t.isJoint && t.type === 'EXPENSE')
                  .reduce((sum, t) => sum + t.amount, 0);
              const totalExpenses = filteredTransactions
                  .filter(t => t.type === 'EXPENSE')
                  .reduce((sum, t) => sum + t.amount, 0);
              const percentage = totalExpenses > 0 ? (jointExpenses / totalExpenses) * 100 : 0;

              return (
                  <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conjunto (Ambos)</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm bg-indigo-500"
                              style={{ width: `${percentage}%` }}
                          />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter pt-0.5">
                          <span>R$ 0,00</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jointExpenses)}</span>
                      </div>
                  </div>
              );
          })()}

          {users.map(user => {
            const userExpenses = filteredTransactions
              .filter(t => t.userId === user.id && t.type === 'EXPENSE' && !t.isJoint) // Exclude joint from individual
              .reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = filteredTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0);
            const percentage = totalExpenses > 0 ? (userExpenses / totalExpenses) * 100 : 0;

            return (
              <div key={user.id} className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.avatarColor }} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${percentage}%`, backgroundColor: user.avatarColor }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter pt-0.5">
                   <span>R$ 0,00</span>
                   <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(userExpenses)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Visuals;
