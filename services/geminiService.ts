import { Transaction, Category } from "../types";

export const getFinancialInsights = async (transactions: Transaction[]): Promise<any> => {
  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    });
    if (!response.ok) throw new Error('Falha ao obter insights do servidor');
    return await response.json();
  } catch (error) {
    console.error("Erro ao obter insights:", error);
    return { insights: [], summary: "Não foi possível gerar insights agora.", suggestedBudget: [] };
  }
};

export const parseStatement = async (rawText: string, categories: Category[]): Promise<Partial<Transaction>[]> => {
  try {
    const response = await fetch('/api/parse-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, categories })
    });
    if (!response.ok) throw new Error('Falha ao processar extrato via servidor');
    return await response.json();
  } catch (error) {
    console.error("Erro ao processar extrato via IA:", error);
    throw error;
  }
};

export const analyzeReceiptImage = async (base64Image: string, categories: Category[]): Promise<Partial<Transaction>> => {
  try {
    const response = await fetch('/api/analyze-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, categories })
    });
    if (!response.ok) throw new Error('Falha ao analisar imagem via servidor');
    return await response.json();
  } catch (error) {
    console.error("Erro ao analisar imagem:", error);
    throw error;
  }
};

export const parseStatementFile = async (base64Data: string, mimeType: string, categories: Category[]): Promise<Partial<Transaction>[]> => {
  try {
    const response = await fetch('/api/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType, categories })
    });
    if (!response.ok) throw new Error('Falha ao processar arquivo via servidor');
    return await response.json();
  } catch (error) {
    console.error("Erro ao processar arquivo de extrato via IA:", error);
    throw error;
  }
};
