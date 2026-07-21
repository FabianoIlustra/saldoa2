import { GoogleGenAI } from "@google/genai";
import { Transaction, Category, Account, User } from "../types";

// Helper to check if we should force client-side (e.g. on static hosting like pages.dev)
const isStaticHosting = (): boolean => {
  const hostname = window.location.hostname;
  return (
    hostname.includes("pages.dev") ||
    hostname.includes("github.io") ||
    hostname.includes("vercel.app") ||
    hostname.includes("netlify.app")
  );
};

// Helper to get GoogleGenAI client on the frontend safely
const getClientAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente (.env)."
    );
  }
  if (apiKey.startsWith("AIzaSyAY")) {
    throw new Error(
      "A chave VITE_GEMINI_API_KEY parece ser inválida ou expirada (começa com AIzaSyAY). Por favor, configure uma chave Gemini válida no seu arquivo .env ou no painel da Cloudflare."
    );
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Universal router that tries server-side API first, 
 * and automatically falls back to client-side direct calling if it fails or if on static hosts.
 */
const executeAI = async <T>(
  apiPath: string,
  payload: any,
  clientFallback: () => Promise<T>
): Promise<T> => {
  // If we are definitely on a static host, skip the fetch attempt to avoid console 405 error noise
  if (isStaticHosting()) {
    console.log(`[A2Bot] Direct client-side mode enabled (Static host detected: ${window.location.hostname})`);
    return await clientFallback();
  }

  try {
    const response = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // If the server returns a 405 (Method Not Allowed) or 404 (Not Found), it means we are in a static context!
    if (response.status === 405 || response.status === 404) {
      console.warn(`[A2Bot] Server returned ${response.status} for ${apiPath}. Falling back to direct client-side execution.`);
      return await clientFallback();
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Erro do servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn(`[A2Bot] Server request failed, trying client-side fallback:`, error.message || error);
    try {
      return await clientFallback();
    } catch (fallbackError: any) {
      // Throw a clear error message combining both failure details so they can troubleshoot easily
      throw new Error(
        `Falha na comunicação: ${fallbackError.message || fallbackError}`
      );
    }
  }
};

export const getFinancialInsights = async (transactions: Transaction[]): Promise<any> => {
  return executeAI(
    '/api/insights',
    { transactions },
    async () => {
      const ai = getClientAI();
      const prompt = `
        Analise as seguintes transações financeiras e forneça insights inteligentes para o usuário.
        Transações: ${JSON.stringify(transactions)}
        
        Por favor, retorne uma resposta em JSON estruturado com:
        1. Uma lista de insights (título, conselho e tipo: SAVING, WARNING ou OPPORTUNITY).
        2. Um resumo textual curto da saúde financeira.
        3. Sugestões de limites de orçamento por categoria.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite", // Cheap & fast for high concurrency!
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      return JSON.parse(response.text || "{}");
    }
  );
};

export const parseStatement = async (rawText: string, categories: Category[]): Promise<Partial<Transaction>[]> => {
  return executeAI(
    '/api/parse-statement',
    { rawText, categories },
    async () => {
      const ai = getClientAI();
      const categoryNames = categories.map(c => c.name).join(", ");
      const prompt = `
        Você é um extrator de dados bancários. Receba o texto abaixo e extraia as transações.
        Categorias disponíveis: [${categoryNames}]
        Texto do Extrato:
        """
        ${rawText}
        """
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                description: { type: "STRING" },
                amount: { type: "NUMBER" },
                type: { type: "STRING", enum: ["INCOME", "EXPENSE"] },
                category: { type: "STRING" },
                date: { type: "STRING" }
              },
              required: ["description", "amount", "type", "category", "date"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    }
  );
};

export const analyzeReceiptImage = async (base64Image: string, categories: Category[]): Promise<Partial<Transaction>> => {
  return executeAI(
    '/api/analyze-receipt',
    { base64Image, categories },
    async () => {
      const ai = getClientAI();
      const categoryNames = categories.map(c => c.name).join(", ");
      const prompt = `Analise este recibo/nota fiscal e extraia os dados financeiros.
        Categorias permitidas: [${categoryNames}]
        Identifique: Descrição (ex: "Almoço no Restaurante X"), Valor total, Tipo (sempre EXPENSE para recibos de compra), Categoria e Data (formato YYYY-MM-DD).
        Se não encontrar a data, use a data de hoje. Se o valor tiver vírgula, converta para ponto.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              description: { type: "STRING" },
              amount: { type: "NUMBER" },
              type: { type: "STRING", enum: ["EXPENSE"] },
              category: { type: "STRING" },
              date: { type: "STRING" }
            },
            required: ["description", "amount", "type", "category", "date"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    }
  );
};

export const parseStatementFile = async (base64Data: string, mimeType: string, categories: Category[]): Promise<Partial<Transaction>[]> => {
  return executeAI(
    '/api/parse-file',
    { base64Data, mimeType, categories },
    async () => {
      const ai = getClientAI();
      const categoryNames = categories.map(c => c.name).join(", ");
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
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
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
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                description: { type: "STRING" },
                amount: { type: "NUMBER" },
                type: { type: "STRING", enum: ["INCOME", "EXPENSE"] },
                category: { type: "STRING" },
                date: { type: "STRING" }
              },
              required: ["description", "amount", "type", "category", "date"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    }
  );
};

export const processVoiceCommand = async (spokenText: string, accounts: Account[], categories: Category[]): Promise<any> => {
  return executeAI(
    '/api/voice-command',
    { text: spokenText, accounts, categories },
    async () => {
      const ai = getClientAI();
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
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
      return JSON.parse(textResult);
    }
  );
};

export const processChatCommand = async (
  userMessage: string,
  accounts: Account[],
  categories: Category[],
  currentUser: User,
  transactions: Transaction[]
): Promise<any> => {
  return executeAI(
    '/api/chat-command',
    { userMessage, accounts, categories, currentUser, transactions },
    async () => {
      const ai = getClientAI();
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
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
        return { isTransaction: true, data: parsed };
      } else {
        const context = `Você é o consultor de IA do Saldo A2, um aplicativo de controle financeiro para casais.
        Você está ajudando ${currentUser?.name || 'usuário'}.
        Aqui está o histórico recente de transações: ${JSON.stringify((transactions || []).slice(0, 15))}.
        Discorra de forma breve, simpática e objetiva sobre a dúvida: ${userMessage}`;

        const generalResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: context,
        });

        return {
          isTransaction: false,
          answer: generalResponse.text || 'Desculpe, não entendi.'
        };
      }
    }
  );
};
