
// Force sync
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, BrainCircuit, Mic, MicOff, Volume2, Trash2 } from 'lucide-react';
import { Transaction, ChatMessage, User } from '../types';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";

interface AIConsultantProps {
  transactions: Transaction[];
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

const AIConsultant: React.FC<AIConsultantProps> = ({ transactions, currentUser, onAddTransaction, autoStartVoice, onVoiceHandled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Refs para sessão de voz
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (autoStartVoice && !isVoiceActive) {
      startVoice();
      onVoiceHandled?.();
    }
  }, [autoStartVoice]);

  const toggleVoice = async () => {
    if (isVoiceActive) {
      stopVoice();
      return;
    }
    startVoice();
  };

  const startVoice = async () => {
    try {
      setIsVoiceActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const addTransactionTool = {
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

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [addTransactionTool] }],
          systemInstruction: `Você é o assistente de voz do Saldo A2. 
          Você está falando com ${currentUser.name}.
          Sua tarefa é ouvir o usuário e ajudá-lo a registrar transações. 
          Quando o usuário disser algo como "Gastei 10 reais com café", chame a função registrar_transacao.
          Sempre confirme verbalmente com uma frase curta e simpática.`
        },
        callbacks: {
          onopen: () => {
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'registrar_transacao') {
                  const data = fc.args as any;
                  onAddTransaction({
                    ...data,
                    userId: currentUser.id,
                    accountId: 'default', // Fallback to default account
                    date: new Date().toISOString().split('T')[0],
                    recurrence: 'NONE'
                  });
                  
                  setMessages(prev => [...prev, { 
                    role: 'model', 
                    text: `✅ Entendido! Registrei: ${data.description} (R$ ${data.amount}) na categoria ${data.category}.` 
                  }]);

                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: "Transação registrada com sucesso!" } }
                    });
                  });
                }
              }
            }
          },
          onerror: (e) => {
            console.error("Erro voz:", e);
            stopVoice();
          },
          onclose: () => stopVoice()
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Falha ao iniciar voz:", err);
      setIsVoiceActive(false);
    }
  };

  const stopVoice = () => {
    setIsVoiceActive(false);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (sessionRef.current) sessionRef.current.close();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `Você está ajudando ${currentUser.name}. Contexto financeiro (últimas 20 transações): ${JSON.stringify(transactions.slice(0, 20))}. Pergunta: ${userMessage}`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Ouvindo...
                </span>
              ) : "Pronto para ajudar"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMessages([])} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <Trash2 className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 dark:bg-slate-900/50 transition-colors">
        {messages.length === 0 && !isVoiceActive && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center mb-6 transition-colors">
              <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Olá, {currentUser.name.split(' ')[0]}!</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Diga: "Registrar gasto de 20 reais com mercado" ou pergunte sobre seu saldo atual.
            </p>
          </div>
        )}

        {isVoiceActive && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 animate-pulse">
            <div className="flex gap-1 items-end h-12">
              {[1,2,3,4,5,4,3,2,1].map((h, i) => (
                <div key={i} className="w-1 bg-indigo-500 rounded-full" style={{ height: `${h * 20}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold">Modo de Voz Ativo</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center">Fale seu comando agora...<br/>Chame as funções para registrar gastos.</p>
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
            onClick={toggleVoice}
            className={`p-4 rounded-[1.5rem] transition-all shadow-lg flex-shrink-0 ${
              isVoiceActive ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
    </div>
  );
};

export default AIConsultant;
