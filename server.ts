import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a large JSON limit since we might receive base64-encoded receipt images
  app.use(express.json({ limit: '50mb' }));

  // Helper to get GoogleGenAI client safely
  const getAI = () => {
    let apiKey = process.env.GEMINI_API_KEY;
    
    // Prioritize GEMINI_API_KEY, but if missing, fall back to VITE_GEMINI_API_KEY ONLY if it's not the known invalid one starting with 'AIzaSyAY'
    if (!apiKey && process.env.VITE_GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY.startsWith('AIzaSyAY')) {
      apiKey = process.env.VITE_GEMINI_API_KEY;
    }
    
    // Full fallback if still no key
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    }

    if (!apiKey) {
      throw new Error('Chave de API do Gemini não configurada no ambiente.');
    }

    console.log(`Using API key (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)})`);
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Helper to run content generation with fallback to gemini-3.1-flash-lite if gemini-3.5-flash is overloaded
  const generateContentWithFallback = async (ai: any, params: any) => {
    const primaryModel = params.model || 'gemini-3.5-flash';
    const fallbackModel = 'gemini-3.1-flash-lite';

    try {
      console.log(`[AI] Attempting generateContent with model: ${primaryModel}`);
      const res = await ai.models.generateContent({
        ...params,
        model: primaryModel
      });
      return res;
    } catch (error: any) {
      const errStr = String(error.message || error);
      console.warn(`[AI] Primary model ${primaryModel} failed:`, errStr);
      
      // If we are already running the fallback model, or if the error is due to an invalid key,
      // propagate the error immediately rather than masking auth/setup issues.
      if (primaryModel === fallbackModel || errStr.includes('API key not valid') || errStr.includes('API_KEY_INVALID')) {
        throw error;
      }

      console.log(`[AI] Falling back to model: ${fallbackModel}`);
      const res = await ai.models.generateContent({
        ...params,
        model: fallbackModel
      });
      return res;
    }
  };

  // 1. Get Financial Insights endpoint
  app.post('/api/insights', async (req, res) => {
    try {
      const { transactions } = req.body;
      const ai = getAI();

      const prompt = `
        Analise as seguintes transações financeiras e forneça insights inteligentes para o usuário.
        Transações: ${JSON.stringify(transactions)}
        
        Por favor, retorne uma resposta em JSON estruturado com:
        1. Uma lista de insights (título, conselho e tipo: SAVING, WARNING ou OPPORTUNITY).
        2. Um resumo textual curto da saúde financeira.
        3. Sugestões de limites de orçamento por categoria.
      `;

      const response = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      let text = response.text?.trim() || '{}';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '');
        text = text.replace(/\s*```$/, '');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Error getting financial insights on server:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model' });
    }
  });

  // 2. Parse raw bank statement endpoint
  app.post('/api/parse-statement', async (req, res) => {
    try {
      const { rawText, categories } = req.body;
      const ai = getAI();
      const categoryNames = categories.map((c: any) => c.name).join(', ');

      const prompt = `
        Você é um extrator de dados bancários. Receba o texto abaixo e extraia as transações.
        Categorias disponíveis: [${categoryNames}]
        Texto do Extrato:
        """
        ${rawText}
        """
      `;

      const response = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                category: { type: Type.STRING },
                date: { type: Type.STRING }
              },
              required: ['description', 'amount', 'type', 'category', 'date']
            }
          }
        }
      });

      let text = response.text?.trim() || '[]';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '');
        text = text.replace(/\s*```$/, '');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Error parsing statement on server:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model' });
    }
  });

  // 3. Analyze receipt image endpoint
  app.post('/api/analyze-receipt', async (req, res) => {
    try {
      const { base64Image, categories } = req.body;
      const ai = getAI();
      const categoryNames = categories.map((c: any) => c.name).join(', ');

      const prompt = `Analise este recibo/nota fiscal e extraia os dados financeiros.
        Categorias permitidas: [${categoryNames}]
        Identifique: Descrição (ex: "Almoço no Restaurante X"), Valor total, Tipo (sempre EXPENSE para recibos de compra), Categoria e Data (formato YYYY-MM-DD).
        Se não encontrar a data, use a data de hoje. Se o valor tiver vírgula, converta para ponto.`;

      const response = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ['EXPENSE'] },
              category: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ['description', 'amount', 'type', 'category', 'date']
          }
        }
      });

      let text = response.text?.trim() || '{}';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '');
        text = text.replace(/\s*```$/, '');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Error analyzing receipt on server:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model' });
    }
  });

  // 4. Parse statement file endpoint
  app.post('/api/parse-file', async (req, res) => {
    try {
      const { base64Data, mimeType, categories } = req.body;
      const ai = getAI();
      const categoryNames = categories.map((c: any) => c.name).join(', ');

      const prompt = `
        Você é um assistente financeiro especializado em ler faturas de cartão de crédito e extratos bancários.
        Analise o documento fornecido (PDF ou Imagem) e extraia TODAS as transações financeiras listadas.
        
        Categorias disponíveis para classificação: [${categoryNames}]
        
        Para cada transação, extraia:
        - Descrição (Nome do estabelecimento ou descrição do lançamento)
        - Valor (Sempre positivo, converta para número decimal)
        - Tipo (Se for gasto/compra = EXPENSE, se for pagamento/crédito = INCOME)
        - Categoria (Escolha a melhor categoria da lista acima baseada na descrição)
        - Data (Formato YYYY-MM-DD. Se a fatura tiver apenas dia/mês, use o ano atual ou o ano da data de vencimento se visível)

        Ignore linhas de saldo total, pagamentos efetuados de faturas anteriores ou juros, foque nas compras e lançamentos novos.
      `;

      const response = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                category: { type: Type.STRING },
                date: { type: Type.STRING }
              },
              required: ['description', 'amount', 'type', 'category', 'date']
            }
          }
        }
      });

      let text = response.text?.trim() || '[]';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '');
        text = text.replace(/\s*```$/, '');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Error parsing file on server:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model' });
    }
  });

  // 5. Voice Command parsing endpoint
  app.post('/api/voice-command', async (req, res) => {
    try {
      const { text: spokenText, accounts, categories } = req.body;
      const ai = getAI();

      const prompt = `Você é o interpretador de comandos por voz do Saldo A2, um app financeiro para casais.
Analise a frase falada pelo usuário e extraia os detalhes da transação ou transferência.

Contas bancárias cadastradas pelo usuário:
${JSON.stringify(accounts.map((a: any) => ({ id: a.id, name: a.name })))}

Categorias cadastradas pelo usuário (use as existentes se houver proximidade semântica):
${JSON.stringify(categories.map((c: any) => ({ id: c.id, name: c.name, type: c.type })))}

Frase dita pelo usuário: "${spokenText}"

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

      const response = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      let textResult = response.text?.trim() || '{}';
      if (textResult.startsWith('```')) {
        textResult = textResult.replace(/^```(?:json)?\s*/i, '');
        textResult = textResult.replace(/\s*```$/, '');
      }

      res.json(JSON.parse(textResult));
    } catch (error: any) {
      console.error('Error parsing voice command on server:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model' });
    }
  });

  // 6. Chat Command endpoint
  app.post('/api/chat-command', async (req, res) => {
    try {
      const { userMessage, accounts, categories, currentUser, transactions } = req.body;
      const ai = getAI();

      // First check if user message is a text-based transaction command
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

Contas cadastradas: ${JSON.stringify(accounts.map((a: any) => ({ id: a.id, name: a.name })))}
Categorias: ${JSON.stringify(categories.map((c: any) => ({ id: c.id, name: c.name, type: c.type })))}`;

      const response = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: commandPrompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      let textResult = response.text?.trim() || '{}';
      if (textResult.startsWith('```')) {
        textResult = textResult.replace(/^```(?:json)?\s*/i, '');
        textResult = textResult.replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(textResult);

      if (parsed.isTransaction && parsed.amount > 0) {
        res.json({ isTransaction: true, data: parsed });
      } else {
        // Fall back to general assistant conversation
        const context = `Você é o consultor de IA do Saldo A2, um aplicativo de controle financeiro para casais.
        Você está ajudando ${currentUser?.name || 'usuário'}.
        Aqui está o histórico recente de transações: ${JSON.stringify((transactions || []).slice(0, 15))}.
        Discorra de forma breve, simpática e objetiva sobre a dúvida: ${userMessage}`;

        const generalResponse = await generateContentWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: context,
        });

        res.json({
          isTransaction: false,
          answer: generalResponse.text || 'Desculpe, não entendi.'
        });
      }
    } catch (error: any) {
      console.error('Error parsing chat command on server:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
