
// Force sync
import React, { useState } from 'react';
import { X, FileText, Upload, Check, AlertCircle, Loader2, Clipboard, FileCode, CreditCard } from 'lucide-react';
import { Category, Account } from '../types';
import { parseStatement, parseStatementFile } from '../services/geminiService';

interface StatementImporterProps {
  categories: Category[];
  accounts: Account[];
  onImport: (transactions: any[], accountId: string) => void;
  onClose: () => void;
}

const StatementImporter: React.FC<StatementImporterProps> = ({ categories, accounts, onImport, onClose }) => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  const [categoryRules, setCategoryRules] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('finan_ai_import_rules') || '{}');
    } catch {
      return {};
    }
  });

  const parseOFX = (content: string) => {
    try {
      const transactions: any[] = [];
      
      // Normalize content to handle different line endings and whitespace
      const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Regex to find transaction blocks (STMTTRN)
      // Handles both multiline and single-line formats
      const transactionBlocks = normalizedContent.split('<STMTTRN>');
      
      // Ignore the first block (header)
      for (let i = 1; i < transactionBlocks.length; i++) {
        const block = transactionBlocks[i];
        
        // Helper to extract tag value
        const extractTag = (tag: string) => {
          const regex = new RegExp(`<${tag}>(.*?)(?:\n|<)`, 'i');
          const match = block.match(regex);
          return match ? match[1].trim() : '';
        };

        const type = extractTag('TRNTYPE');
        const dateStr = extractTag('DTPOSTED');
        const amountStr = extractTag('TRNAMT');
        const name = extractTag('NAME');
        const memo = extractTag('MEMO');
        const fitid = extractTag('FITID');
        
        // Parse date (YYYYMMDDHHMMSS...)
        // Some OFX files might have timezone info, we just take the first 8 chars for YYYYMMDD
        let formattedDate = '';
        if (dateStr && dateStr.length >= 8) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            formattedDate = `${year}-${month}-${day}`;
        }

        // Parse amount
        // Handle both comma and dot as decimal separator if needed, though OFX standard is dot
        const amount = parseFloat(amountStr.replace(',', '.'));
        
        // Construct description
        // Prefer MEMO if available and different from NAME, otherwise NAME
        // For Credit Cards, NAME is often the merchant
        let description = name;
        if (memo && memo !== name) {
            description = name ? `${name} - ${memo}` : memo;
        }
        if (!description) description = 'Transação OFX';

        // Check for learned category
        let learnedCategory = 'Outros';
        if (categoryRules[description]) {
            learnedCategory = categoryRules[description];
        } else {
            const ruleKey = Object.keys(categoryRules).find(key => description.startsWith(key));
            if (ruleKey) {
                learnedCategory = categoryRules[ruleKey];
            }
        }

        if (!isNaN(amount) && formattedDate) {
          transactions.push({
            date: formattedDate,
            description: description,
            amount: Math.abs(amount),
            type: amount < 0 ? 'EXPENSE' : 'INCOME',
            category: learnedCategory, 
            originalId: fitid
          });
        }
      }
      return transactions;
    } catch (e) {
      console.error("Erro ao processar OFX", e);
      throw new Error("Formato OFX inválido ou não suportado.");
    }
  };

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Check if it looks like OFX
      if (rawText.includes('<OFX>') || rawText.includes('<STMTTRN>')) {
        const result = parseOFX(rawText);
        setPreview(result);
      } else {
        // Fallback to AI (CSV/Text)
        const result = await parseStatement(rawText, categories);
        const resultWithRules = result.map(t => {
            if (t.description && categoryRules[t.description]) return { ...t, category: categoryRules[t.description] };
            const ruleKey = Object.keys(categoryRules).find(key => t.description?.startsWith(key));
            return ruleKey ? { ...t, category: categoryRules[ruleKey] } : t;
        });
        setPreview(resultWithRules);
      }
    } catch (err) {
      setError('Não foi possível processar o arquivo. Verifique se é um OFX válido ou tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Handle PDF or Images
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setLoading(true);
        setError(null);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64Data = base64String.split(',')[1];
            
            try {
                const result = await parseStatementFile(base64Data, file.type, categories);
                const resultWithRules = result.map(t => {
                    if (t.description && categoryRules[t.description]) return { ...t, category: categoryRules[t.description] };
                    const ruleKey = Object.keys(categoryRules).find(key => t.description?.startsWith(key));
                    return ruleKey ? { ...t, category: categoryRules[ruleKey] } : t;
                });
                setPreview(resultWithRules);
            } catch (err) {
                setError('Erro ao processar arquivo PDF/Imagem via IA.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsDataURL(file);
        return;
    }

    // Handle Text/OFX/CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      // Auto-process if OFX
      if (file.name.toLowerCase().endsWith('.ofx') || content.includes('<OFX>')) {
         setTimeout(() => {
             try {
                 const result = parseOFX(content);
                 setPreview(result);
             } catch (err) {
                 setError('Erro ao ler arquivo OFX.');
             }
         }, 100);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    const newRules = { ...categoryRules };
    preview.forEach(t => {
        if (t.category !== 'Outros') {
            newRules[t.description] = t.category;
        }
    });
    localStorage.setItem('finan_ai_import_rules', JSON.stringify(newRules));
    setCategoryRules(newRules);

    onImport(preview, selectedAccountId);
    onClose();
  };

  const removeTransaction = (index: number) => {
    setPreview(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 dark:border-slate-800 transition-colors">
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Importar Extrato</h2>
              <p className="text-indigo-100 text-xs font-medium">Suporta OFX (Banco/Cartão), CSV ou Texto (IA)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {!preview.length ? (
            <div className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-3xl flex gap-4 text-indigo-800 dark:text-indigo-300 transition-colors">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm leading-relaxed font-medium">
                  <strong>Dica:</strong> Para maior precisão, faça upload do arquivo <strong>.OFX</strong> exportado pelo seu banco ou cartão de crédito.
                </p>
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 ml-2">Conta de Destino</label>
                  <select 
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                      {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                  </select>
              </div>

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Cole aqui o texto do extrato ou arraste um arquivo OFX..."
                className="w-full h-48 p-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl focus:border-indigo-500 focus:ring-0 outline-none transition-all resize-none text-sm font-mono dark:text-white dark:placeholder-slate-500"
              />

              <div className="flex flex-col md:flex-row gap-4">
                <label className="flex-1 flex items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-500 py-4 rounded-2xl cursor-pointer transition-all font-bold text-slate-600 dark:text-slate-300 group">
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-xl group-hover:scale-110 transition-transform">
                    <FileCode className="w-5 h-5 text-indigo-500" />
                  </div>
                  <span>Selecionar Arquivo (OFX, PDF, CSV)</span>
                  <input type="file" accept=".ofx,.csv,.txt,.pdf,image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                
                <button
                  disabled={!rawText.trim() || loading}
                  onClick={handleProcess}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clipboard className="w-5 h-5" />}
                  Processar Texto
                </button>
              </div>
              {error && <p className="text-rose-500 text-center text-sm font-bold animate-bounce bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl">{error}</p>}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg">Validar Importação ({preview.length})</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                        Conta: {accounts.find(a => a.id === selectedAccountId)?.name}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setPreview([])} className="text-sm text-slate-500 font-bold hover:text-rose-500 transition-all">Cancelar</button>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden mb-6 transition-colors max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-black tracking-widest sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Descrição</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                    {preview.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{item.date}</td>
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.description}</td>
                        <td className="px-6 py-4">
                          <select 
                            className="bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-xl text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase border-none outline-none focus:ring-2 focus:ring-indigo-500"
                            value={item.category}
                            onChange={(e) => {
                                const newPreview = [...preview];
                                newPreview[i].category = e.target.value;
                                setPreview(newPreview);
                            }}
                          >
                              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              <option value="Outros">Outros</option>
                          </select>
                        </td>
                        <td className={`px-6 py-4 font-black whitespace-nowrap ${item.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {item.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => removeTransaction(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 dark:shadow-none"
              >
                <Check className="w-6 h-6" /> Confirmar Importação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatementImporter;
