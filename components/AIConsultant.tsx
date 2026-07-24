// Force sync
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, BrainCircuit, Mic, MicOff, Volume2, VolumeX, Trash2, AlertCircle, X } from 'lucide-react';
import { Transaction, ChatMessage, User, Account, Category } from '../types';
import { processVoiceCommand, processChatCommand, isLocalModeEnabled } from '../services/geminiService';

interface AIConsultantProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currentUser: User;
  onAddTransaction: (data: any) => void;
  autoStartVoice?: boolean;
  onVoiceHandled?: () => void;
}

const AIConsultant: React.FC<AIConsultantProps> = ({ 
  transactions, 
  accounts, 
  categories,
  currentUser, 
  onAddTransaction, 
  autoStartVoice, 
  onVoiceHandled 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'responding'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('finan_ai_voice_output_enabled') === 'true';
  });

  const [pendingReview, setPendingReview] = useState<any | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Web Speech API refs
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isVoiceActiveRef = useRef(false);
  const transcribedTextRef = useRef('');

  const toggleVoiceOutput = () => {
    const newValue = !isVoiceOutputEnabled;
    setIsVoiceOutputEnabled(newValue);
    localStorage.setItem('finan_ai_voice_output_enabled', String(newValue));
    if (!newValue) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Handle automatic voice starting from Dashboard redirect
  useEffect(() => {
    if (autoStartVoice) {
      setMessages([]);
      const hasPermission = localStorage.getItem('finan_ai_mic_permission') === 'true';
      if (hasPermission) {
        startVoice();
      } else {
        setShowMicPermission(true);
      }
      onVoiceHandled?.();
    }
  }, [autoStartVoice]);

  // Clean up speech and timers on unmount
  useEffect(() => {
    return () => {
      stopVoiceStreamOnly();
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakMessage = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!isVoiceOutputEnabled) {
        resolve();
        return;
      }
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.onend = () => {
        resolve();
      };
      utterance.onerror = () => {
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const stopVoiceStreamOnly = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopVoice = () => {
    isVoiceActiveRef.current = false;
    setIsVoiceActive(false);
    setVoiceState('idle');
    stopVoiceStreamOnly();
  };

  const startVoice = async () => {
    setIsVoiceActive(true);
    setVoiceState('listening');
    setVoiceError(null);
    setTranscribedText('');
    transcribedTextRef.current = '';
    isVoiceActiveRef.current = true;

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Reconhecimento de voz não suportado neste navegador. Use o Google Chrome ou Safari.");
      }

      // Request browser microphone stream permission and immediately release tracks
      // so SpeechRecognition can access the hardware without audio-capture conflicts!
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(track => track.stop());
        } catch (err: any) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw new Error("Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do seu navegador.");
          }
        }
      }

      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setVoiceState('listening');
        setVoiceError(null);
      };

      rec.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript + ' ';
        }
        currentText = currentText.trim();
        if (currentText) {
          setTranscribedText(currentText);
          transcribedTextRef.current = currentText;
        }

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Trigger processing after 1.5 seconds of silence
        if (currentText.length > 2) {
          silenceTimerRef.current = setTimeout(() => {
            if (isVoiceActiveRef.current && transcribedTextRef.current) {
              processVoiceCommandText(transcribedTextRef.current);
            }
          }, 1500);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        if (e.error === 'no-speech') {
          return;
        }
        let errMsg = "Erro no microfone: " + e.error;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          errMsg = "Acesso ao microfone negado ou bloqueado no navegador.";
        } else if (e.error === 'audio-capture') {
          errMsg = "Microfone não encontrado ou indisponível.";
        }
        setVoiceError(errMsg);
        stopVoice();
      };

      rec.onend = () => {
        // If user stopped talking and we captured text, process it now!
        if (isVoiceActiveRef.current && transcribedTextRef.current && voiceState !== 'processing') {
          processVoiceCommandText(transcribedTextRef.current);
        } else if (isVoiceActiveRef.current && voiceState !== 'processing') {
          // Restart recognition to keep listening if no text was captured yet
          try {
            rec.start();
          } catch (err) {}
        }
      };

      recognitionRef.current = rec;
      rec.start();

    } catch (err: any) {
      console.error("Falha ao iniciar voz:", err);
      setVoiceError(err.message || "Não foi possível acessar o microfone.");
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
    }
  };

  const processVoiceCommandText = async (text: string) => {
    setVoiceState('processing');
    stopVoiceStreamOnly();

    try {
      const parsedJson = await processVoiceCommand(text, accounts, categories, currentUser, transactions);

      if (parsedJson.isTransaction && parsedJson.amount > 0) {
        const targetAccountId = parsedJson.accountId || accounts[0]?.id || 'default';

        setPendingReview({
          description: parsedJson.description || 'Lançamento por voz',
          amount: parsedJson.amount,
          type: parsedJson.type || 'EXPENSE',
          category: parsedJson.category || 'Outros',
          accountId: targetAccountId,
          toAccountId: parsedJson.type === 'TRANSFER' ? parsedJson.toAccountId : undefined,
          userId: currentUser.id,
          date: new Date().toISOString().split('T')[0],
          recurrence: 'NONE'
        });

        const confirmMsg = parsedJson.responseMessage || `Entendi! Deseja lançar "${parsedJson.description || 'Lançamento por voz'}" de R$ ${parsedJson.amount}. Por favor, confirme ou ajuste os detalhes abaixo:`;
        
        setMessages(prev => [
          ...prev,
          { role: 'user', text: `🎙️ ${text}` },
          { role: 'model', text: confirmMsg }
        ]);

        setVoiceState('responding');
        await speakMessage(confirmMsg.replace('✅', '').trim());
        
        setIsVoiceActive(false);
        setVoiceState('idle');

      } else {
        const answer = parsedJson.responseMessage || "Desculpe, não consegui entender o valor ou o comando. Pode repetir?";
        
        setMessages(prev => [
          ...prev,
          { role: 'user', text: `🎙️ ${text}` },
          { role: 'model', text: answer }
        ]);

        setVoiceState('responding');
        await speakMessage(answer);
        
        setIsVoiceActive(false);
        setVoiceState('idle');
      }

    } catch (err: any) {
      console.error("Erro no processamento da voz:", err);
      const errMsg = err.message || "Ocorreu um erro ao processar seu comando de voz. Por favor, tente novamente.";
      setMessages(prev => [
        ...prev,
        { role: 'user', text: `🎙️ ${text}` },
        { role: 'model', text: `Erro: ${errMsg}` }
      ]);
      setVoiceError(errMsg);
      setIsVoiceActive(false);
      setVoiceState('idle');
    }
  };

  const toggleVoice = () => {
    if (isVoiceActive) {
      if (transcribedTextRef.current.trim().length > 3) {
        processVoiceCommandText(transcribedTextRef.current.trim());
      } else {
        stopVoice();
      }
    } else {
      const hasPermission = localStorage.getItem('finan_ai_mic_permission') === 'true';
      if (hasPermission) {
        startVoice();
      } else {
        setShowMicPermission(true);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const result = await processChatCommand(
        userMessage,
        accounts,
        categories,
        currentUser,
        transactions
      );

      if (result.isTransaction && result.data) {
        const parsed = result.data;
        const targetAccountId = parsed.accountId || accounts[0]?.id || 'default';

        setPendingReview({
          description: parsed.description || 'Lançamento por chat',
          amount: parsed.amount,
          type: parsed.type || 'EXPENSE',
          category: parsed.category || 'Outros',
          accountId: targetAccountId,
          toAccountId: parsed.type === 'TRANSFER' ? parsed.toAccountId : undefined,
          userId: currentUser.id,
          date: new Date().toISOString().split('T')[0],
          recurrence: 'NONE'
        });

        const confirmMsg = parsed.responseMessage || `Entendi! Deseja lançar "${parsed.description || 'Lançamento por chat'}" de R$ ${parsed.amount}. Por favor, confirme ou ajuste os detalhes abaixo:`;
        setMessages(prev => [...prev, { role: 'model', text: confirmMsg }]);
        speakMessage(confirmMsg.replace('✅', '').trim());

      } else {
        const answerText = result.answer || "Desculpe, não entendi.";
        setMessages(prev => [...prev, { role: 'model', text: answerText }]);
        speakMessage(answerText);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao processar sua solicitação." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-200px)] sm:h-[calc(100dvh-210px)] min-h-[300px] md:h-[680px] animate-in fade-in duration-500 transition-colors">
      <div className="p-2 sm:p-5 bg-slate-900 dark:bg-black text-white flex items-center justify-between transition-colors shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-indigo-600 rounded-xl sm:rounded-2xl shrink-0">
            <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base block">A2Bot</span>
              {isLocalModeEnabled() && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                  Leitor Local 🟢
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
              {isVoiceActive ? (
                voiceState === 'processing' ? (
                  <span className="flex items-center gap-1 text-indigo-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processando...
                  </span>
                ) : voiceState === 'responding' ? (
                  <span className="flex items-center gap-1 text-amber-400 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span> Respondendo...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Ouvindo...
                  </span>
                )
              ) : "Pronto para ajudar"}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 items-center">
          {voiceError && (
            <div className="bg-rose-500/20 text-rose-300 text-[9px] sm:text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 border border-rose-500/30 truncate max-w-[120px] sm:max-w-none">
              <AlertCircle className="w-3 h-3 shrink-0" /> <span className="truncate">{voiceError}</span>
            </div>
          )}
          <button 
            onClick={toggleVoiceOutput} 
            title={isVoiceOutputEnabled ? "Desativar voz do robô" : "Ativar voz do robô"} 
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${isVoiceOutputEnabled ? 'hover:bg-white/10 text-emerald-400' : 'hover:bg-white/10 text-slate-400'}`}
          >
            {isVoiceOutputEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button onClick={() => setMessages([])} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors" title="Limpar conversa">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4 bg-slate-50/30 dark:bg-slate-900/50 transition-colors">
        {messages.length === 0 && !isVoiceActive && (
          <div className="flex flex-col items-center justify-center p-3 sm:p-6 text-center max-w-sm mx-auto my-auto h-full">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-3 transition-colors animate-pulse">
              <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-base sm:text-xl font-black text-slate-800 dark:text-white mb-1.5">Aperte o microfone para registrar</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Toque no botão verde de microfone abaixo e fale seu lançamento para que o A2Bot registre para você automaticamente.
            </p>
            <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl">
              Ex: <span className="font-semibold text-emerald-600 dark:text-emerald-400">"Almoço de 35 reais no cartão"</span>
            </div>
          </div>
        )}

        {isVoiceActive && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 sm:space-y-6 p-2">
            {voiceState === 'processing' ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-9 h-9 sm:w-12 sm:h-12 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse text-base sm:text-lg">Processando comando...</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm text-center">O A2Bot está analisando seu áudio e processando o lançamento...</p>
              </div>
            ) : voiceState === 'responding' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1.5 items-end h-8 sm:h-12">
                  {[2, 4.5, 3, 5, 2.5, 4, 1.5, 3, 2].map((h, i) => (
                    <div key={i} className="w-1 sm:w-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" style={{ height: `${h * 20}%`, animationDelay: `${i * 0.12}s`, animationDuration: '0.75s' }} />
                  ))}
                </div>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base sm:text-lg">A2Bot Respondendo...</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm text-center font-medium italic">"{transcribedText}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1 items-end h-8 sm:h-12">
                  {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                    <div key={i} className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${h * 20}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-base sm:text-lg animate-pulse">Ouvindo você...</p>
                
                {transcribedText ? (
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl max-w-md text-center flex flex-col items-center gap-2">
                    <p className="text-indigo-950 dark:text-indigo-200 font-semibold text-sm sm:text-base italic">"{transcribedText}"</p>
                    <button
                      type="button"
                      onClick={() => processVoiceCommandText(transcribedText)}
                      className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 mt-1"
                    >
                      <Send className="w-3.5 h-3.5" /> Processar Agora
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm text-center leading-relaxed">
                    Fale seu comando agora...<br />
                    Ex: <span className="font-semibold text-indigo-500">"Gastei 15 reais com almoço"</span> ou<br />
                    <span className="font-semibold text-indigo-500">"Recebi R$ 2500 de salário"</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] sm:max-w-[80%] p-3.5 sm:p-5 rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm leading-relaxed shadow-2xs transition-colors ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" /></div>}
      </div>

      <div className="p-3 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors shrink-0">
        <div className="flex gap-2 sm:gap-3">
          <button 
            type="button"
            onClick={toggleVoice}
            className={`p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] transition-all shadow-md flex-shrink-0 active:scale-95 ${
              isVoiceActive ? 'bg-rose-500 text-white scale-105 shadow-rose-200 animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isVoiceActive ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
          <form onSubmit={handleSend} className="flex-1 flex gap-2 sm:gap-3">
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou comando..."
              className="flex-1 px-4 py-2.5 sm:py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl sm:rounded-[1.5rem] text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim() || isVoiceActive}
              className="bg-indigo-600 text-white p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] hover:bg-indigo-700 disabled:bg-indigo-300 transition-all shadow-md dark:shadow-none shrink-0"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </form>
        </div>
      </div>

      {showMicPermission && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <Mic className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black">Acesso ao Microfone</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                O A2Bot precisa de acesso ao seu microfone para ouvir seus comandos de voz e registrar suas despesas ou receitas diretamente no seu extrato.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMicPermission(false)}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMicPermission(false);
                  localStorage.setItem('finan_ai_mic_permission', 'true');
                  startVoice();
                }}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-colors text-sm"
              >
                Permitir
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingReview && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4 text-slate-900 dark:text-white">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800/80 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
                <h2 className="text-lg font-black tracking-tight">Confirmar Lançamento</h2>
              </div>
              <button 
                onClick={() => setPendingReview(null)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Tipo Selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'EXPENSE', label: 'Despesa', color: 'bg-rose-500 text-white' },
                    { value: 'INCOME', label: 'Receita', color: 'bg-emerald-500 text-white' },
                    { value: 'TRANSFER', label: 'Transf.', color: 'bg-indigo-500 text-white' }
                  ].map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setPendingReview({ ...pendingReview, type: t.value })}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        pendingReview.type === t.value 
                          ? t.color + ' shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Descrição</label>
                <input
                  type="text"
                  value={pendingReview.description}
                  onChange={(e) => setPendingReview({ ...pendingReview, description: e.target.value })}
                  placeholder="Ex: Almoço, Supermercado..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pendingReview.amount || ''}
                  onChange={(e) => setPendingReview({ ...pendingReview, amount: Number(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoria</label>
                <select
                  value={pendingReview.category}
                  onChange={(e) => setPendingReview({ ...pendingReview, category: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Outros">Outros</option>
                </select>
              </div>

              {/* Conta de Origem */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                  {pendingReview.type === 'TRANSFER' ? 'Conta de Origem' : 'Conta'}
                </label>
                <select
                  value={pendingReview.accountId}
                  onChange={(e) => setPendingReview({ ...pendingReview, accountId: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {/* Conta de Destino se for transferência */}
              {pendingReview.type === 'TRANSFER' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Conta de Destino</label>
                  <select
                    value={pendingReview.toAccountId || ''}
                    onChange={(e) => setPendingReview({ ...pendingReview, toAccountId: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione a conta de destino...</option>
                    {accounts.filter(acc => acc.id !== pendingReview.accountId).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingReview(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors font-bold"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingReview.description.trim()) {
                    alert('Por favor, informe uma descrição.');
                    return;
                  }
                  if (pendingReview.amount <= 0) {
                    alert('Por favor, informe um valor maior que zero.');
                    return;
                  }
                  if (pendingReview.type === 'TRANSFER' && !pendingReview.toAccountId) {
                    alert('Por favor, informe a conta de destino.');
                    return;
                  }
                  onAddTransaction({
                    ...pendingReview,
                    description: pendingReview.description.trim()
                  });
                  setPendingReview(null);
                }}
                className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-colors font-bold"
              >
                Confirmar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultant;
