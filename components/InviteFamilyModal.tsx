import React, { useState } from 'react';
import { X, Copy, CheckCircle, LogOut, Heart, Lock, Sparkles, Users, ArrowRight, Check } from 'lucide-react';
import { User } from '../types';

interface InviteFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: User | null;
  users: User[] | undefined;
  onLinkUser: (code: string) => void;
  onUnlinkUser: (id: string) => void;
  isCoupleMode: boolean;
  onToggleCoupleMode: (couple: boolean) => void;
  onUpdateProfile: (updates: Partial<User>) => void;
}

const InviteFamilyModal: React.FC<InviteFamilyModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  users,
  onLinkUser,
  onUnlinkUser,
  isCoupleMode,
  onToggleCoupleMode,
  onUpdateProfile
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [newName, setNewName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isBlocked = !currentUserProfile?.tier || currentUserProfile.tier === 'gratis' || currentUserProfile.tier === 'basico';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUserProfile?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: '1',
      title: 'Cadastro Individual',
      desc: 'Cada usuário participante precisa ter o seu próprio cadastro e e-mail de acesso individual ativo no sistema.'
    },
    {
      num: '2',
      title: 'Copie e compartilhe seu código',
      desc: 'Copie seu código único abaixo e envie para o familiar ou parceiro que deseja conectar.'
    },
    {
      num: '3',
      title: 'Vincule as contas',
      desc: 'A outra pessoa entra na conta dela, cola o seu código em "Entrar em uma Família" e clica em Entrar.'
    },
    {
      num: '4',
      title: 'Ative o Modo Família',
      desc: 'Com as contas vinculadas, ative o Modo Família para visualizarem as transações em conjunto.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 rounded-xl flex items-center justify-center text-rose-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Convidar Membro para Família</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gerencie finanças compartilhadas de forma rápida e segura</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Step by step guide */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-rose-50/60 dark:from-indigo-950/20 dark:to-rose-950/20 rounded-2xl p-5 border border-indigo-100/30 dark:border-indigo-900/20">
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              Como funciona o Modo Família?
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {step.num}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{step.title}</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User management control panel */}
          <div className="space-y-4">
            
            {/* Toggle Family Mode */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5 text-left">
                <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">Configuração Compartilhada</span>
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Ativar Modo Família</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Ative para visualizar os lançamentos de todos os membros integrados.</p>
              </div>

              <button 
                onClick={() => {
                  if (isBlocked) {
                    onClose();
                    document.getElementById('trigger-subscription-modal')?.click();
                    return;
                  }
                  onToggleCoupleMode(!isCoupleMode);
                }}
                className={`w-full md:w-auto p-3 rounded-xl border flex items-center justify-between gap-4 transition-all relative overflow-hidden ${
                  isCoupleMode 
                    ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30 text-rose-600' 
                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500'
                }`}
              >
                {isBlocked && (
                  <div className="absolute right-2 top-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Premium
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isCoupleMode ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    <Heart className={`w-3.5 h-3.5 ${isCoupleMode ? 'fill-current' : ''}`} />
                  </div>
                  <span className="font-extrabold text-xs uppercase tracking-wider">{isCoupleMode ? 'Modo Família Ativo' : 'Ativar Família'}</span>
                </div>
                <div className={`w-8 h-4.5 rounded-full relative transition-colors shrink-0 ${isCoupleMode ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${isCoupleMode ? 'left-4' : 'left-0.5'}`} />
                </div>
              </button>
            </div>

            {/* Code Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Convidar Pessoa (Copy Code) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 relative flex flex-col justify-between">
                {isBlocked && (
                  <div 
                    onClick={() => {
                      onClose();
                      document.getElementById('trigger-subscription-modal')?.click();
                    }}
                    className="absolute inset-0 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] rounded-2xl z-10 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-950/20 transition-all"
                  >
                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white">Conexão de Família Bloqueada</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Disponível nos planos Médio e Premium</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1.5 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Ver Planos</span>
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Seu Código de Convite</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">Envie este código para a outra pessoa se conectar.</p>
                  
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60 mb-3">
                    <code className="flex-1 font-mono font-bold text-center text-xs tracking-wider text-indigo-600 dark:text-indigo-400 truncate">{currentUserProfile?.id}</code>
                    <button 
                      onClick={handleCopy} 
                      className={`p-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' : 'text-slate-400 hover:text-indigo-600 border-transparent'}`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 mb-1">Seu Nome de Exibição</h5>
                  {isEditingName ? (
                    <div className="flex gap-1.5">
                      <input 
                        type="text" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-[11px]"
                      />
                      <button 
                        onClick={() => {
                          if (newName) {
                            onUpdateProfile({ name: newName });
                            setIsEditingName(false);
                          }
                        }}
                        className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setIsEditingName(false)}
                        className="bg-slate-200 dark:bg-slate-700 text-slate-500 p-1.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-650"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">{currentUserProfile?.name || 'Usuário'}</span>
                      <button 
                        onClick={() => {
                          setNewName(currentUserProfile?.name || '');
                          setIsEditingName(true);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-[9px] font-black uppercase tracking-wider"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Entrar em uma Família */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 relative flex flex-col justify-between min-h-[160px]">
                {isBlocked && (
                  <div 
                    onClick={() => {
                      onClose();
                      document.getElementById('trigger-subscription-modal')?.click();
                    }}
                    className="absolute inset-0 bg-slate-50/10 dark:bg-slate-900/10 backdrop-blur-[1px] rounded-2xl z-10 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-950/20 transition-all"
                  >
                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white">Conexão de Família Bloqueada</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Disponível nos planos Médio e Premium</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1.5 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Ver Planos</span>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Entrar em uma Família</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">Insira o código enviado pelo seu familiar para se conectar.</p>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Cole o código aqui"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 dark:text-white"
                  />
                  <button 
                    onClick={() => {
                      if (joinCode) {
                        onLinkUser(joinCode);
                        setJoinCode('');
                      }
                    }}
                    disabled={!joinCode}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-50 text-[10px] h-fit self-center"
                  >
                    Entrar
                  </button>
                </div>
              </div>

            </div>

            {/* Members list */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3">Membros da Família Conectados</h4>
              
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {users && users.length > 0 ? (
                  users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-800/25 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: u.avatarColor }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                            {u.name} {u.id === currentUserProfile?.id && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">(Você)</span>}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{u.id}</p>
                        </div>
                      </div>
                      {u.id !== currentUserProfile?.id && (
                        <button 
                          onClick={() => onUnlinkUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Desvincular membro"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-4">Nenhum membro da família conectado ainda.</p>
                )}
              </div>
            </div>

          </div>

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

export default InviteFamilyModal;
