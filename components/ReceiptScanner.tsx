
// Force sync
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Sparkles, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Category, Transaction, Account } from '../types';
import { analyzeReceiptImage } from '../services/geminiService';

interface ReceiptScannerProps {
  categories: Category[];
  accounts: Account[];
  onConfirm: (data: any) => void;
  onClose: () => void;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ categories, accounts, onConfirm, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<Transaction> | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage(reader.result as string);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeReceiptImage(base64, categories);
      setResult(data);
    } catch (err) {
      alert("Erro ao ler o recibo. Tente uma foto mais nítida.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalConfirm = () => {
    if (result && selectedAccountId) {
      onConfirm({
        ...result,
        accountId: selectedAccountId,
        recurrence: 'NONE'
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6" />
            <h2 className="text-xl font-black tracking-tight">Scanner de Recibos IA</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!image ? (
            <div className="space-y-6">
              <div className="aspect-[3/4] border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mb-6">
                  <ImageIcon className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">Capture seu Recibo</h3>
                <p className="text-sm text-slate-500 mb-8 max-w-xs">Tire uma foto nítida de uma nota fiscal ou recibo para que a IA processe.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all shadow-sm"
                  >
                    <Camera className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-widest">Câmera</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all shadow-sm"
                  >
                    <Upload className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-widest">Galeria</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-[3/4] shadow-2xl">
                <img src={image} className="w-full h-full object-contain" alt="Recibo" />
                
                {loading && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                    <div className="w-full h-1 bg-indigo-500 absolute top-0 animate-[scan_2s_infinite]"></div>
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-black uppercase text-xs tracking-[0.2em] animate-pulse">IA Analisando...</p>
                  </div>
                )}
              </div>

              {result && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 flex gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-emerald-700 dark:text-emerald-400">Leitura Concluída!</h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500/80 font-medium">Revisamos os dados para você.</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Data</label>
                        <p className="text-sm font-bold">{result.date}</p>
                      </div>
                      <div className="text-right">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Valor</label>
                        <p className="text-xl font-black text-indigo-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.amount || 0)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Descrição</label>
                      <p className="text-sm font-bold">{result.description}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoria sugerida</label>
                      <span className="inline-block px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-black uppercase">{result.category}</span>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Lançar na Conta</label>
                      <select 
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none text-sm font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => { setImage(null); setResult(null); }}
                      className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all"
                    >
                      Refazer
                    </button>
                    <button 
                      onClick={handleFinalConfirm}
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" /> Confirmar Gasto
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptScanner;
