// Force sync
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, BrainCircuit, Mic, MicOff, Volume2, VolumeX, Trash2, AlertCircle } from 'lucide-react';
import { Transaction, ChatMessage, User, Account, Category } from '../types';
import { GoogleGenAI } from "@google/genai";

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
    return localStorage.getItem('finan_ai_voice_output_enabled') !== 'false';
  });

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

      // Request browser microphone stream to guarantee permission inside iframes
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        if (err.name === 'NotAllowedError') throw new Error("Permissão de microfone negada pelo navegador.");
        throw err;
      });
      streamRef.current = stream;

      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setVoiceState('listening');
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = (finalTranscript + interimTranscript).trim();
        setTranscribedText(currentText);
        transcribedTextRef.current = currentText;

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // If the user says something substantial and then pauses for 2 seconds, process it automatically!
        if (currentText.length > 3) {
          silenceTimerRef.current = setTimeout(() => {
            if (isVoiceActiveRef.current) {
              processVoiceCommandText(currentText);
            }
          }, 2000);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        if (e.error !== 'no-speech') {
          setVoiceError("Erro no microfone: " + e.error);
          stopVoice();
        }
      };

      rec.onend = () => {
        // Keep listening unless deactivated
        if (isVoiceActiveRef.current && !silenceTimerRef.current) {
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
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Você é o interpretador de comandos por voz do Saldo A2, um app financeiro para casais.
Analise a frase falada pelo usuário e extraia os detalhes da transação ou transferência.

Contas bancárias cadastradas pelo usuário:
${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name })))}

Categorias cadastradas pelo usuário (use as existentes se houver proximidade semântica):
${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}

Frase dita pelo usuário: "${text}"

Responda ESTRITAMENTE em formato JSON com o seguinte schema (sem tags markdown):
{
  "isTransaction": boolean, // true se descreveu um ganho/despesa ou transferência com valor monetário e descrição identificável.
  "description": string, // Descrição simples e direta capitalizada (ex: "Almoço", "Uber", "Salário", "Supermercado").
  "amount": number, // Valor numérico positivo.
  "type": "INCOME" | "EXPENSE" | "TRANSFER", // INCOME para receitas/ganhos, EXPENSE para despesas/gastos, TRANSFER para transferências.
  "category": string, // Nome de uma categoria existente ou uma sugerida adequada.
  "accountId": string, // ID da conta correspondente se mencionada. Caso contrário, deixe em branco.
  "toAccountId": string, // ID da conta destino se for TRANSFER.
  "responseMessage": string // Mensagem em português amigável e direta confirmando o registro (ex: "Tudo pronto! Registrei sua despesa de 25 reais em Alimentação.") ou dizendo que não compreendeu o valor/descrição.
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      let cleanText = response.text?.trim() || '{}';
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
        cleanText = cleanText.replace(/\s*```$/, '');
      }
      const parsedJson = JSON.parse(cleanText.trim());

      if (parsedJson.isTransaction && parsedJson.amount > 0) {
        const targetAccountId = parsedJson.accountId || accounts[0]?.id || 'default';

        onAddTransaction({
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

        const confirmMsg = parsedJson.responseMessage || `Feito! Registrei ${parsedJson.description} de R$ ${parsedJson.amount}.`;
        
        setMessages(prev => [
          ...prev,
          { role: 'user', text: `🎙️ ${text}` },
          { role: 'model', text: confirmMsg }
        ]);

        setVoiceState('responding');
        await speakMessage(confirmMsg.replace('✅', '').trim());
        
        // Deactivate voice mode completely as the transaction was successfully processed!
        setIsVoiceActive(false);
        setVoiceState('idle');

      } else {
        const answer = parsedJson.responseMessage || "Desculpe, não consegui entender o valor ou a descrição. Pode repetir?";
        
        setMessages(prev => [
          ...prev,
          { role: 'user', text: `🎙️ ${text}` },
          { role: 'model', text: answer }
        ]);

        setVoiceState('responding');
        await speakMessage(answer);
        
        // Restart voice to keep listening! As requested: "ele precisa ficar escutando e esperando o comando"
        startVoice();
      }

    } catch (err: any) {
      console.error("Erro no processamento da voz por Gemini:", err);
      setMessages(prev => [
        ...prev,
        { role: 'user', text: `🎙️ ${text}` },
        { role: 'model', text: "Ocorreu um erro ao processar seu comando de voz. Por favor, tente novamente." }
      ]);
      setVoiceError("Erro ao processar comando de voz.");
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
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "Chave de API não configurada no ambiente." }]);
        setLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });

      // First check if user message is a text-based transaction command!
      const commandPrompt = `Você é o interpretador do Saldo A2. Verifique se o usuário deseja realizar um lançamento/registro financeiro ou transferência na frase: "${userMessage}".
Responda APENAS em JSON:
{
  "isTransaction": boolean,
  "description": string,
  "amount": number,
  "type": "INCOME" | "EXPENSE" | "TRANSFER",
  "category": string,
  "accountId": string,
  "toAccountId": string,
  "responseMessage": string
}
Se for apenas conversa, dúvidas ou perguntas, responda "isTransaction": false.

Contas cadastradas: ${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name })))}
Categorias: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: commandPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      let cleanText = response.text?.trim() || '{}';
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
        cleanText = cleanText.replace(/\s*```$/, '');
      }
      const parsed = JSON.parse(cleanText.trim());

      if (parsed.isTransaction && parsed.amount > 0) {
        const targetAccountId = parsed.accountId || accounts[0]?.id || 'default';

        onAddTransaction({
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

        const confirmMsg = parsed.responseMessage || `Pronto! Lancei ${parsed.description} de R$ ${parsed.amount} na categoria ${parsed.category}.`;
        setMessages(prev => [...prev, { role: 'model', text: confirmMsg }]);
        speakMessage(confirmMsg.replace('✅', '').trim());

      } else {
        // Fall back to general assistant conversation
        const context = `Você é o consultor de IA do Saldo A2, um aplicativo de controle financeiro para casais.
        Você está ajudando ${currentUser.name}.
        Aqui está o histórico recente de transações: ${JSON.stringify(transactions.slice(0, 15))}.
        Discorra de forma breve, simpática e objetiva sobre a dúvida: ${userMessage}`;

        const generalResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: context,
        });

        const answerText = generalResponse.text || "Desculpe, não entendi.";
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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in duration-500 transition-colors">
      <div className="p-6 bg-slate-900 dark:bg-black text-white flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold block">A2Bot</span>
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
        <div className="flex gap-2 items-center">
          {voiceError && (
            <div className="bg-rose-500/20 text-rose-300 text-[10px] px-3 py-1 rounded-full flex items-center gap-1 border border-rose-500/30">
              <AlertCircle className="w-3 h-3" /> {voiceError}
            </div>
          )}
          <button 
            onClick={toggleVoiceOutput} 
            title={isVoiceOutputEnabled ? "Desativar voz do robô" : "Ativar voz do robô"} 
            className={`p-2 rounded-xl transition-colors ${isVoiceOutputEnabled ? 'hover:bg-white/10 text-emerald-400' : 'hover:bg-white/10 text-slate-400'}`}
          >
            {isVoiceOutputEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button onClick={() => setMessages([])} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Limpar conversa">
            <Trash2 className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 dark:bg-slate-900/50 transition-colors">
        {messages.length === 0 && !isVoiceActive && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto my-auto h-full">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 transition-colors animate-pulse">
              <Mic className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Aperte o microfone para registrar</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Toque no botão verde de microfone abaixo e fale seu lançamento para que o A2Bot registre para você automaticamente.
            </p>
            <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-2 rounded-xl">
              Ex: <span className="font-semibold text-emerald-600 dark:text-emerald-400">"Almoço de 35 reais no cartão"</span>
            </div>
          </div>
        )}

        {isVoiceActive && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            {voiceState === 'processing' ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse text-lg">Processando comando...</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm text-center">O A2Bot está analisando seu áudio e processando o lançamento...</p>
              </div>
            ) : voiceState === 'responding' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-1.5 items-end h-12">
                  {[2, 4.5, 3, 5, 2.5, 4, 1.5, 3, 2].map((h, i) => (
                    <div key={i} className="w-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-bounce" style={{ height: `${h * 20}%`, animationDelay: `${i * 0.12}s`, animationDuration: '0.75s' }} />
                  ))}
                </div>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">A2Bot Respondendo...</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm text-center font-medium italic">"{transcribedText}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-1 items-end h-12">
                  {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                    <div key={i} className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${h * 20}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg animate-pulse">Ouvindo você...</p>
                
                {transcribedText ? (
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl max-w-md text-center">
                    <p className="text-indigo-950 dark:text-indigo-200 font-semibold text-base italic">"{transcribedText}"</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Aguardando comando completo ou faça silêncio para processar...</p>
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm text-center leading-relaxed">
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
            <div className={`max-w-[80%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm transition-colors ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" /></div>}
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={toggleVoice}
            className={`p-4 rounded-[1.5rem] transition-all shadow-lg flex-shrink-0 active:scale-95 ${
              isVoiceActive ? 'bg-rose-500 text-white scale-110 shadow-rose-200 animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isVoiceActive ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <form onSubmit={handleSend} className="flex-1 flex gap-3">
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou comando..."
              className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-[1.5rem] text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim() || isVoiceActive}
              className="bg-indigo-600 text-white p-4 rounded-[1.5rem] hover:bg-indigo-700 disabled:bg-indigo-300 transition-all shadow-lg dark:shadow-none"
            >
              <Send className="w-6 h-6" />
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
    </div>
  );
};

export default AIConsultant;
