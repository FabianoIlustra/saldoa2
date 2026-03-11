
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Category } from "../types";

export const getFinancialInsights = async (transactions: Transaction[]): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analise as seguintes transações financeiras e forneça insights inteligentes para o usuário.
    Transações: ${JSON.stringify(transactions)}
    
    Por favor, retorne uma resposta em JSON estruturado com:
    1. Uma lista de insights (título, conselho e tipo: SAVING, WARNING ou OPPORTUNITY).
    2. Um resumo textual curto da saúde financeira.
    3. Sugestões de limites de orçamento por categoria.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro ao obter insights:", error);
    return { insights: [], summary: "Não foi possível gerar insights agora.", suggestedBudget: [] };
  }
};

export const parseStatement = async (rawText: string, categories: Category[]): Promise<Partial<Transaction>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const categoryNames = categories.map(c => c.name).join(", ");
  
  const prompt = `
    Você é um extrator de dados bancários. Receba o texto abaixo e extraia as transações.
    Categorias disponíveis: [${categoryNames}]
    Texto do Extrato:
    """
    ${rawText}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["description", "amount", "type", "category", "date"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Erro ao processar extrato via IA:", error);
    throw error;
  }
};

export const analyzeReceiptImage = async (base64Image: string, categories: Category[]): Promise<Partial<Transaction>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const categoryNames = categories.map(c => c.name).join(", ");

  const prompt = `Analise este recibo/nota fiscal e extraia os dados financeiros.
    Categorias permitidas: [${categoryNames}]
    Identifique: Descrição (ex: "Almoço no Restaurante X"), Valor total, Tipo (sempre EXPENSE para recibos de compra), Categoria e Data (formato YYYY-MM-DD).
    Se não encontrar a data, use a data de hoje. Se o valor tiver vírgula, converta para ponto.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["EXPENSE"] },
            category: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["description", "amount", "type", "category", "date"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro ao analisar imagem:", error);
    throw error;
  }
};

export const parseStatementFile = async (base64Data: string, mimeType: string, categories: Category[]): Promise<Partial<Transaction>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["description", "amount", "type", "category", "date"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Erro ao processar arquivo de extrato via IA:", error);
    throw error;
  }
};
