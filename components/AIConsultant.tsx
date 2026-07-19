
// Force sync
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, BrainCircuit, Mic, MicOff, Volume2, VolumeX, Trash2, AlertCircle } from 'lucide-react';
import { Transaction, ChatMessage, User, Account } from '../types';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";

interface AIConsultantProps {
  transactions: Transaction[];
  accounts: Account[];
  currentUser: User;
  onAddTransaction: (data: any) => void;
  autoStartVoice?: boolean;
  onVoiceHandled?: () => void;
}

// Auxiliares para Áudio
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function downsample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return data;
  if (toRate > fromRate) return data; // only downsample
  const ratio = fromRate / toRate;
  const newLength = Math.round(data.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetData = 0;
  while (offsetResult < result.length) {
    const nextOffsetData = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetData; i < nextOffsetData && i < data.length; i++) {
      accum += data[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetData = nextOffsetData;
  }
  return result;
}

const AIConsultant: React.FC<AIConsultantProps> = ({ transactions, accounts, currentUser, onAddTransaction, autoStartVoice, onVoiceHandled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'responding'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('finan_ai_voice_output_enabled') !== 'false';
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Refs para sessão de voz
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const transactionAddedRef = useRef<boolean>(false);

  const toggleVoiceOutput = () => {
    const newValue = !isVoiceOutputEnabled;
    setIsVoiceOutputEnabled(newValue);
    localStorage.setItem('finan_ai_voice_output_enabled', String(newValue));
    
    if (!newValue) {
      audioQueueRef.current = [];
      if (activeSourceRef.current) {
        try {
          activeSourceRef.current.stop();
        } catch (e) {
          // ignore
        }
        activeSourceRef.current = null;
      }
      if (isVoiceActive) {
        setVoiceState('listening');
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (autoStartVoice) {
      // Just clear and reset for a fresh voice recording session, waiting for user to click
      setMessages([]);
      stopVoice();
      onVoiceHandled?.();
    }
  }, [autoStartVoice]);

  const playAudioQueue = async () => {
    if (!isVoiceOutputEnabled) {
      audioQueueRef.current = [];
      if (isVoiceActive) {
        setVoiceState('listening');
      }
      return;
    }
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;
    
    isPlayingRef.current = true;
    setVoiceState('responding');
    const audioCtx = audioContextRef.current;

    while (audioQueueRef.current.length > 0 && audioCtx.state !== 'closed' && isVoiceOutputEnabled) {
      const data = audioQueueRef.current.shift()!;
      const float32 = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        float32[i] = data[i] / 32768;
      }

      const buffer = audioCtx.createBuffer(1, float32.length, 24000); // Correct sample rate for Gemini's output
      buffer.getChannelData(0).set(float32);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      activeSourceRef.current = source;
      
      await new Promise<void>((resolve) => {
        source.onended = () => {
          activeSourceRef.current = null;
          resolve();
        };
        source.start();
      });
    }
    
    isPlayingRef.current = false;
    if (transactionAddedRef.current) {
      transactionAddedRef.current = false;
      stopVoice();
    } else {
      setVoiceState('listening');
      lastSpeechTimeRef.current = Date.now();
    }
  };

  const startVoice = async () => {
    setIsVoiceActive(true);
    setVoiceState('listening');
    setVoiceError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave de API não configurada. Adicione GEMINI_API_KEY nas Configurações.");
      }
      const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        if (err.name === 'NotAllowedError') throw new Error("Permissão de microfone negada.");
        throw err;
      });

      streamRef.current = stream;

      const registrarTransacaoTool = {
        name: 'registrar_transacao',
        parameters: {
          type: Type.OBJECT,
          description: 'Registra uma nova transação financeira (receita ou despesa).',
          properties: {
            description: { type: Type.STRING, description: 'Breve descrição do gasto ou ganho.' },
            amount: { type: Type.NUMBER, description: 'Valor numérico.' },
            type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'], description: 'Se é Entrada (INCOME) ou Saída (EXPENSE).' },
            category: { type: Type.STRING, description: 'Categoria sugerida (ex: Alimentação, Lazer).' },
          },
          required: ['description', 'amount', 'type', 'category'],
        },
      };

      const registrarTransferenciaTool = {
        name: 'registrar_transferencia',
        parameters: {
          type: Type.OBJECT,
          description: 'Registra uma transferência interna entre duas contas do usuário.',
          properties: {
            description: { type: Type.STRING, description: 'Descrição da transferência (ex: Transferência para reserva).' },
            amount: { type: Type.NUMBER, description: 'Valor da transferência.' },
            fromAccount: { type: Type.STRING, description: 'Nome ou ID da conta de origem.' },
            toAccount: { type: Type.STRING, description: 'Nome ou ID da conta de destino.' },
          },
          required: ['description', 'amount', 'fromAccount', 'toAccount'],
        },
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Charon"
              }
            }
          },
          tools: [{ functionDeclarations: [registrarTransacaoTool, registrarTransferenciaTool] }],
          systemInstruction: `Você é o assistente de voz do Saldo A2. 
          Você está falando com ${currentUser.name}.
          Sua tarefa é ouvir o usuário e ajudá-lo a registrar transações ou transferências. 
          Quando o usuário disser algo como "Gastei 10 reais com café", chame registrar_transacao.
          Quando o usuário disser algo como "Transfira 50 reais da conta Corrente para a Poupança", chame registrar_transferencia.
          Sempre confirme verbalmente com uma frase curta e simpática.`
        },
        callbacks: {
          onopen: () => {
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // VAD / Speech detection to trigger "Processando..." state
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              
              if (rms > 0.008) {
                lastSpeechTimeRef.current = Date.now();
                if (!isPlayingRef.current) {
                  setVoiceState('listening');
                }
              } else {
                if (Date.now() - lastSpeechTimeRef.current > 1500 && !isPlayingRef.current) {
                  setVoiceState('processing');
                }
              }

              // Downsample input from native sampleRate to 16000Hz for Gemini Live API
              const downsampled = downsample(inputData, audioCtx.sampleRate, 16000);
              const pcmBlob = createBlob(downsampled);
              sessionPromise.then(session => session.sendRealtimeInput({
                audio: { 
                  mimeType: 'audio/pcm;rate=16000',
                  data: pcmBlob.data
                }
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Set voiceState to processing when a message begins or a tool is called
            setVoiceState('processing');

            // Audio response from AI
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const binary = atob(base64Audio);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              const int16 = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(int16);
              playAudioQueue();
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'registrar_transacao') {
                  const data = fc.args as any;
                  const targetAccount = accounts[0]?.id || 'default';
                  
                  onAddTransaction({
                    ...data,
                    userId: currentUser.id,
                    accountId: targetAccount,
                    date: new Date().toISOString().split('T')[0],
                    recurrence: 'NONE'
                  });
                  
                  setMessages(prev => [...prev, { 
                    role: 'model', 
                    text: `✅ Entendido! Registrei: ${data.description} (R$ ${data.amount}) na categoria ${data.category}.` 
                  }]);

                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Transação registrada!" } }]
                    });
                  });

                  transactionAddedRef.current = true;
                  if (!isVoiceOutputEnabled) {
                    setTimeout(() => {
                      stopVoice();
                    }, 1500);
                  }
                } else if (fc.name === 'registrar_transferencia') {
                   const data = fc.args as any;
                   onAddTransaction({
                     description: data.description,
                     amount: data.amount,
                     type: 'TRANSFER',
                     category: 'Transferência',
                     userId: currentUser.id,
                     date: new Date().toISOString().split('T')[0],
                     recurrence: 'NONE'
                   });

                   setMessages(prev => [...prev, { 
                    role: 'model', 
                    text: `✅ Entendido! Preparei a transferência de R$ ${data.amount}. Verifique os detalhes das contas.` 
                  }]);

                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Transferência preparada!" } }]
                    });
                  });

                  transactionAddedRef.current = true;
                  if (!isVoiceOutputEnabled) {
                    setTimeout(() => {
                      stopVoice();
                    }, 1500);
                  }
                }
              }
            }
          },
          onerror: (e) => {
            console.error("Erro voz:", e);
            setVoiceError("Ocorreu um erro na conexão de voz.");
            stopVoice();
          },
          onclose: () => stopVoice()
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Falha ao iniciar voz:", err);
      setVoiceError(err.message || "Não foi possível acessar o microfone.");
      setIsVoiceActive(false);
    }
  };

  const stopVoice = () => {
    setIsVoiceActive(false);
    setVoiceState('idle');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error("Erro ao fechar AudioContext:", e));
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
  };

  const toggleVoice = () => {
    if (isVoiceActive) {
      stopVoice();
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
      const context = `Você está ajudando ${currentUser.name}. Contexto financeiro (últimas 20 transações): ${JSON.stringify(transactions.slice(0, 20))}. Pergunta: ${userMessage}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: context,
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Não entendi, pode repetir?" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Erro na conexão com IA." }]);
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
                <p className="text-slate-400 dark:text-slate-500 text-sm text-center">Ouça a confirmação do seu assistente de voz.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-1 items-end h-12">
                  {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                    <div key={i} className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${h * 20}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg animate-pulse">Ouvindo você...</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm text-center leading-relaxed">
                  Fale seu comando agora...<br />
                  Ex: <span className="font-semibold text-indigo-500">"Gastei 15 reais com almoço"</span> ou<br />
                  <span className="font-semibold text-indigo-500">"Recebi R$ 2500 de salário"</span>
                </p>
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
