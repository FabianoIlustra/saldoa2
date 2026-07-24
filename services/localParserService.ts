import { Transaction, Category, Account, User } from "../types";

/**
 * Clean a description string by removing numbers and special characters.
 */
export const cleanDescriptionLocal = (desc: string): string => {
  return desc
    .toUpperCase()
    .replace(/[0-9]/g, "") // Remove numbers
    .replace(/[*#-]/g, " ") // Replace special chars with space
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
};

/**
 * Find learned category from import rules.
 */
export const findLearnedCategoryLocal = (
  description: string,
  importRules: Record<string, string> = {}
): string => {
  const cleanDesc = cleanDescriptionLocal(description);
  
  // 1. Exact match on clean description
  if (importRules[cleanDesc]) return importRules[cleanDesc];

  // 2. Substring match
  const ruleKeys = Object.keys(importRules);
  const sortedKeys = ruleKeys.sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (cleanDesc.includes(key) || key.includes(cleanDesc)) {
      return importRules[key];
    }
  }

  return "Outros";
};

/**
 * Portuguese semantic keyword dictionary for category suggestions.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Alimentação": [
    "ifood", "restaurante", "padaria", "mercado", "supermercado", "almoço", "jantar", "lanche", "pizza",
    "comida", "bar", "churrascaria", "adega", "cafe", "cafeteria", "bobs", "mcdonald", "burger king", "bk",
    "açougue", "panificadora", "sacolao", "hortifruti", "gourmet", "mercados", "compras", "carrefour", "pao de acucar",
    "assai", "atacadao", "zona sul", "extra", "feira", "bebida", "sorvete", "doce"
  ],
  "Transporte": [
    "uber", "99taxi", "99", "taxi", "combustivel", "posto", "gasolina", "etanol", "diesel", "pedagio",
    "estacionamento", "metro", "onibus", "passagem", "voo", "latam", "azul", "gol", "rodoviaria", "bike",
    "mobi", "semparar", "conectcar", "veloe", "mecanico", "oficina", "pneu", "ipva", "licenciamento"
  ],
  "Moradia": [
    "aluguel", "condominio", "luz", "energia", "enel", "copel", "cpfl", "agua", "sabesp", "saneamento",
    "gas", "gás", "internet", "net", "claro", "vivo", "oi", "tim", "iptu", "reforma", "casa", "bricolagem",
    "leroy", "eletricista", "encanador", "moveis", "decoração", "enxoval", "limpeza"
  ],
  "Lazer": [
    "cinema", "netflix", "spotify", "disney", "hbo", "prime video", "show", "ingresso", "viagem", "hotel",
    "air bnb", "airbnb", "hospedagem", "clube", "jogos", "steam", "playstation", "xbox", "nintendo", "teatro",
    "festa", "balada", "pizzaria", "churrasco", "parque", "praia", "passeio", "livro", "kindle"
  ],
  "Saúde": [
    "farmacia", "drogaria", "drogasil", "pague menos", "saude", "saúde", "medico", "médico", "consulta",
    "exame", "hospital", "dentista", "remedio", "remédio", "psicologo", "psicólogo", "terapia", "vacina",
    "clinica", "clínica", "unimed", "bradesco saude", "odonto"
  ],
  "Educação": [
    "escola", "faculdade", "curso", "udemy", "livro", "livraria", "mensalidade", "matricula", "idioma",
    "ingles", "inglês", "colegio", "colégio", "pos-graduacao", "pós-graduação", "workshop", "papelaria"
  ],
  "Pessoal": [
    "shopping", "roupa", "sapato", "renner", "c&a", "cea", "riachuelo", "zara", "salao", "salão",
    "cabeleireiro", "barbearia", "cosmetico", "cosmético", "perfume", "estetica", "estética", "manicure",
    "boticario", "boticário", "natura", "marisa", "decathlon", "centauro", "academia", "treino", "suplemento"
  ],
  "Salário": [
    "salario", "salário", "pagamento", "provento", "recebimento", "pix de", "transferencia de", "reembolso",
    "venda", "faturamento", "pension", "aposentadoria", "receitas", "ganhos", "lucro", "comissao", "comissão"
  ]
};

/**
 * Maps any descriptive text to the best matching category from user's categories.
 */
export const suggestCategoryLocal = (
  description: string,
  categories: Category[]
): string => {
  const descLower = description.toLowerCase();

  // 1. Direct name match
  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    if (descLower.includes(catNameLower) || catNameLower.includes(descLower)) {
      return cat.name;
    }
  }

  // 2. Keyword map check
  for (const [groupName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Check if the user has a category related to this group name (e.g. "Alimentação" or "Comida")
    const matchedCategory = categories.find(c => 
      c.name.toLowerCase().includes(groupName.toLowerCase()) || 
      groupName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchedCategory) {
      const hasKeyword = keywords.some(keyword => descLower.includes(keyword));
      if (hasKeyword) {
        return matchedCategory.name;
      }
    }
  }

  // 3. Fallback to first expense/income category or "Outros"
  const outrosCat = categories.find(c => 
    c.name.toLowerCase().includes("outros") || 
    c.name.toLowerCase().includes("diversos")
  );
  if (outrosCat) return outrosCat.name;

  return categories[0]?.name || "Outros";
};

/**
 * Local bank statement parsing. Supports common Brazilian formats from pasted text or CSV.
 */
export const parseStatementLocal = (
  rawText: string,
  categories: Category[],
  importRules: Record<string, string> = {}
): Partial<Transaction>[] => {
  const lines = rawText.split("\n");
  const transactions: Partial<Transaction>[] = [];
  const todayStr = new Date().toISOString().split("T")[0];

  // Regex patterns to identify dates
  const datePatterns = [
    /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/, // YYYY-MM-DD
    /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/, // DD-MM-YYYY
    /\b(\d{2})[-/](\d{2})[-/](\d{2})\b/, // DD-MM-YY
    /\b(\d{2})[-/](\d{2})\b/             // DD/MM (assume current year)
  ];

  // Regex for money values (e.g. R$ 15,90, -320.00, + 1.500,22, 12)
  const moneyRegex = /(?:R\$\s*)?([+-]?\s*\d+(?:\.\d{3})*(?:,\d{2})|[+-]?\s*\d+(?:\.\d{2})?)/gi;

  for (const line of lines) {
    let cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 5) continue;

    // 1. Detect and extract date
    let dateStr = todayStr;
    let dateFound = false;

    for (const pattern of datePatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        dateFound = true;
        if (match.length === 4) {
          // Check if YYYY is first or last
          if (match[1].length === 4) {
            dateStr = `${match[1]}-${match[2]}-${match[3]}`;
          } else {
            const year = match[3].length === 2 ? `20${match[3]}` : match[3];
            dateStr = `${year}-${match[2]}-${match[1]}`;
          }
        } else if (match.length === 3) {
          // DD/MM - append current year
          const currentYear = new Date().getFullYear();
          dateStr = `${currentYear}-${match[2]}-${match[1]}`;
        }
        // Remove the date string from the line so it doesn't match as a numeric amount
        cleanLine = cleanLine.replace(match[0], " ");
        break;
      }
    }

    // 2. Detect numeric values
    let amount = 0;
    let rawAmountText = "";
    let isNegative = false;
    let isPositive = false;

    // Scan the line for decimal values
    const matches = Array.from(cleanLine.matchAll(moneyRegex));
    if (matches.length > 0) {
      // Find the best match (usually the last value on the line represents the amount)
      const lastMatch = matches[matches.length - 1];
      rawAmountText = lastMatch[0];
      
      let parsedValStr = lastMatch[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
      let parsedVal = parseFloat(parsedValStr);

      if (!isNaN(parsedVal) && parsedVal !== 0) {
        amount = Math.abs(parsedVal);
        isNegative = parsedVal < 0 || rawAmountText.includes("-") || cleanLine.includes("-");
        isPositive = parsedVal > 0 && (rawAmountText.includes("+") || cleanLine.includes("+"));
        
        // Remove amount from line to leave only the description
        cleanLine = cleanLine.replace(rawAmountText, " ");
      }
    }

    if (amount === 0) continue; // Skip lines with no amount

    // 3. Extract description
    let description = cleanLine
      .replace(/[;,\t\r]/g, " ") // replace dividers with spaces
      .replace(/\s+/g, " ")
      .trim();

    // Remove leading/trailing minus/plus symbols and special characters
    description = description.replace(/^[+\-/*#\s]+|[+\-/*#\s]+$/g, "").trim();

    if (!description) {
      description = isNegative ? "Compra S/ Identificação" : "Crédito S/ Identificação";
    }

    // 4. Determine transaction type
    let type: "INCOME" | "EXPENSE" = "EXPENSE";
    const descLower = description.toLowerCase();

    const incomeKeywords = ["salario", "salário", "receb", "ganho", "credito", "crédito", "deposito", "depósito", "rendimento", "reembolso", "pix rec", "ted rec", "doc rec", "venda"];
    const hasIncomeKeyword = incomeKeywords.some(keyword => descLower.includes(keyword) || cleanLine.toLowerCase().includes(keyword));

    if (isPositive || hasIncomeKeyword) {
      type = "INCOME";
    } else if (isNegative) {
      type = "EXPENSE";
    } else {
      // Default: bank statement values are mostly expenses unless specified as income
      type = "EXPENSE";
    }

    // 5. Categorize
    // Use learned rules first
    let category = findLearnedCategoryLocal(description, importRules);
    if (category === "Outros") {
      category = suggestCategoryLocal(description, categories);
    }

    transactions.push({
      date: dateStr,
      description: description.charAt(0).toUpperCase() + description.slice(1),
      amount: amount,
      type: type,
      category: category,
      recurrence: "NONE"
    });
  }

  return transactions;
};

/**
 * Local Voice Command parser.
 */
export const processVoiceCommandLocal = (
  spokenText: string,
  accounts: Account[],
  categories: Category[],
  currentUser?: User,
  transactions: Transaction[] = []
): any => {
  const text = spokenText.toLowerCase().trim();

  // Common number words in Portuguese
  const numberWords: Record<string, number> = {
    "zero": 0, "um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3, "tres": 3, "quatro": 4, "cinco": 5,
    "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10, "onze": 11, "doze": 12, "treze": 13,
    "quatorze": 14, "catorze": 14, "quinze": 15, "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19,
    "vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50, "sessenta": 60, "setenta": 70,
    "oitenta": 80, "noventa": 90, "cem": 100, "cento": 100, "duzentos": 200, "trezentos": 300,
    "quatrocentos": 400, "quinhentos": 500, "seiscentos": 600, "setecentos": 700, "oitocentos": 800, "novecentos": 900
  };

  let amount = 0;
  let matchedMoneyText = "";

  // Check pattern for cents like "50 e 20", "50 reais e 20 centavos", "cinquenta e vinte"
  const centsPattern = /(\d+)\s*(?:reais|real|conto|pila)?\s*e\s*(\d{1,2})\s*(?:centavos)?\b/i;
  const centsMatch = text.match(centsPattern);
  if (centsMatch) {
    const mainVal = parseInt(centsMatch[1], 10);
    const centsVal = parseInt(centsMatch[2], 10);
    if (!isNaN(mainVal) && !isNaN(centsVal)) {
      amount = mainVal + (centsVal < 10 ? centsVal / 10 : centsVal / 100);
      matchedMoneyText = centsMatch[0];
    }
  }

  // Find digit numbers: "50", "22.50", "15,90", "R$ 100"
  if (amount === 0) {
    const moneyRegex = /(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;
    let match;
    while ((match = moneyRegex.exec(text)) !== null) {
      const numStr = match[1].replace(/\./g, "").replace(",", ".");
      const num = parseFloat(numStr);
      if (num > 0 && num > amount) {
        amount = num;
        matchedMoneyText = match[0];
      }
    }
  }

  // Fallback to spoken number words
  if (amount === 0) {
    let currentSum = 0;
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const w = words[i].replace(/[.,]/g, "");
      if (w === "mil") {
        currentSum = currentSum === 0 ? 1000 : currentSum * 1000;
        matchedMoneyText += " " + words[i];
      } else if (numberWords[w] !== undefined) {
        currentSum += numberWords[w];
        matchedMoneyText += " " + words[i];
      }
    }
    if (currentSum > 0) {
      amount = currentSum;
      matchedMoneyText = matchedMoneyText.trim();
    }
  }

  if (amount === 0) {
    // Check if user is asking a general question (saldo, teto, extrato, etc.)
    const chatFallback = processChatCommandLocal(spokenText, accounts, categories, currentUser || { id: '1', name: 'Usuário' }, transactions);
    if (chatFallback.answer && !chatFallback.answer.includes("Não entendi se você quis lançar algo")) {
      return {
        isTransaction: false,
        responseMessage: chatFallback.answer
      };
    }
    return {
      isTransaction: false,
      responseMessage: "Desculpe, não consegui identificar um valor em reais. Você pode dizer por exemplo: 'gastei 30 reais na padaria' ou perguntar 'qual meu saldo?'."
    };
  }

  // Determine Type
  let type: "INCOME" | "EXPENSE" | "TRANSFER" = "EXPENSE";
  if (/\b(transferi|mandei|enviei|pix enviado|transferencia|envia|manda|passa|transferência)\b/i.test(text)) {
    type = "TRANSFER";
  } else if (/\b(recebi|ganhei|salario|salário|receita|pix recebido|deposito|depósito|entrou|reembolso|faturei|faturamento)\b/i.test(text)) {
    type = "INCOME";
  }

  // Detect Accounts
  let accountId = "";
  let toAccountId = "";
  let fromAccountName = "";
  let toAccountName = "";

  accounts.forEach(acc => {
    const nameLower = acc.name.toLowerCase();
    const nameRegex = new RegExp(`\\b${nameLower}\\b`, "i");
    if (nameRegex.test(text)) {
      if (type === "TRANSFER") {
        const deRegex = new RegExp(`(?:de|do|da|pelo|pela)\\s+${nameLower}`, "i");
        const paraRegex = new RegExp(`(?:para|pro|pra|destino|recebe)\\s+${nameLower}`, "i");
        if (deRegex.test(text)) {
          accountId = acc.id;
          fromAccountName = acc.name;
        } else if (paraRegex.test(text)) {
          toAccountId = acc.id;
          toAccountName = acc.name;
        } else {
          if (!accountId) {
            accountId = acc.id;
            fromAccountName = acc.name;
          } else if (!toAccountId) {
            toAccountId = acc.id;
            toAccountName = acc.name;
          }
        }
      } else {
        accountId = acc.id;
        fromAccountName = acc.name;
      }
    }
  });

  // Assign defaults
  if (!accountId && accounts.length > 0) {
    accountId = accounts[0].id;
    fromAccountName = accounts[0].name;
  }
  if (type === "TRANSFER" && !toAccountId && accounts.length > 1) {
    const otherAcc = accounts.find(a => a.id !== accountId);
    if (otherAcc) {
      toAccountId = otherAcc.id;
      toAccountName = otherAcc.name;
    }
  }

  // Extract description (cleaning fillers and matched patterns)
  let description = spokenText;
  if (matchedMoneyText) {
    description = description.replace(new RegExp(matchedMoneyText, "gi"), "");
  }

  const stopWords = [
    /gastei/gi, /comprei/gi, /paguei/gi, /recebi/gi, /ganhei/gi, /depositei/gi, /transferi/gi, /mandei/gi, /enviei/gi,
    /faturei/gi, /registra/gi, /anota/gi, /lança/gi, /lançar/gi, /lançamento/gi,
    /com\b/gi, /de\b/gi, /da\b/gi, /do\b/gi, /para\b/gi, /pro\b/gi, /pra\b/gi, /no\b/gi, /na\b/gi, /num\b/gi, /numa\b/gi, /em\b/gi,
    /reais/gi, /real/gi, /pila/gi, /conto/gi, /centavos/gi, /dinheiro/gi, /pago/gi, /fatura/gi, /conta/gi, /valor\b/gi, /quantia\b/gi, /de\s+r\$/gi, /r\$/gi,
    /banco/gi, /carteira/gi, /poupança/gi, /corrente/gi
  ];
  // Remove account names from description
  accounts.forEach(acc => {
    stopWords.push(new RegExp(acc.name, "gi"));
  });

  stopWords.forEach(pattern => {
    description = description.replace(pattern, " ");
  });

  description = description.replace(/\s+/g, " ").trim();
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    if (type === "TRANSFER") {
      description = `Transferência para ${toAccountName || "outra conta"}`;
    } else if (type === "INCOME") {
      description = `Receita recebida`;
    } else {
      description = `Gasto registrado`;
    }
  }

  // Suggest Category
  const category = suggestCategoryLocal(description, categories);

  // Formulate response
  const formattedVal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  let responseMessage = "";

  if (type === "TRANSFER") {
    responseMessage = `✅ Feito! Registrei transferência de ${formattedVal} de ${fromAccountName} para ${toAccountName || "outra conta"}.`;
  } else if (type === "INCOME") {
    responseMessage = `✅ Tudo pronto! Receita de ${formattedVal} lançada em ${category} na conta ${fromAccountName}.`;
  } else {
    responseMessage = `✅ Registrado! Despesa de ${formattedVal} lançada em ${category} na conta ${fromAccountName}.`;
  }

  return {
    isTransaction: true,
    description,
    amount,
    type,
    category,
    accountId,
    toAccountId,
    responseMessage
  };
};

/**
 * Local Chat Command assistant.
 */
export const processChatCommandLocal = (
  userMessage: string,
  accounts: Account[],
  categories: Category[],
  currentUser: User,
  transactions: Transaction[]
): any => {
  const textLower = userMessage.toLowerCase().trim();

  // First, check if there's any mention of financial values to treat as transaction
  const moneyRegex = /(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?|\d+(?:\.\d{2})?)/gi;
  const matches = Array.from(textLower.matchAll(moneyRegex));
  const hasSpokenNumbers = /\b(um|dois|três|quatro|cinco|dez|vinte|trinta|quarenta|cinquenta|cem)\b/i.test(textLower);

  if (matches.length > 0 || hasSpokenNumbers) {
    const voiceResult = processVoiceCommandLocal(userMessage, accounts, categories);
    if (voiceResult.isTransaction) {
      return {
        isTransaction: true,
        data: voiceResult
      };
    }
  }

  // Handle general chatting questions
  let answer = "";
  if (textLower.match(/\b(ola|olá|oi|bom dia|boa tarde|boa noite|hello|hey)\b/i)) {
    answer = `Olá ${currentUser.name || "usuário"}! Sou o assistente local do Saldo A2 (Rodando 100% offline, sem IA). Posso registrar lançamentos rapidamente ou calcular seu saldo. Diga por exemplo: "gastei 50 no mercado" ou "recebi 2000 reais"!`;
  } else if (textLower.match(/\b(saldo|balanco|quanto tenho|dinheiro|total)\b/i)) {
    const total = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const accountsList = accounts.map(a => `${a.name}: **${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(a.currentBalance)}**`).join("\n");
    answer = `Aqui está o seu balanço atualizado em tempo real (Leitor Local):\n\n${accountsList}\n\n💵 **Saldo Consolidado Total: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}**`;
  } else if (textLower.match(/\b(teto|limite|gasto|spending|ceiling)\b/i)) {
    if (currentUser.spendingCeiling) {
      const expenses = transactions
        .filter(t => t.type === "EXPENSE" && !t.isTemplate)
        .reduce((sum, t) => sum + t.amount, 0);
      const remaining = currentUser.spendingCeiling - expenses;
      const pct = (expenses / currentUser.spendingCeiling) * 100;
      answer = `Seu teto de gastos mensal é de **R$ ${currentUser.spendingCeiling.toLocaleString("pt-BR")}**. Até agora você gastou **R$ ${expenses.toLocaleString("pt-BR")}** (${pct.toFixed(1)}%). Restam **R$ ${remaining.toLocaleString("pt-BR")}** para gastar de forma segura este mês.`;
    } else {
      answer = `Você não possui um teto de gastos geral configurado no momento. Defina um limite nas configurações do sistema para acompanhar seu orçamento mensal!`;
    }
  } else if (textLower.match(/\b(historico|extrato|ultimas|recentes|transacoes|transações)\b/i)) {
    const recent = transactions.filter(t => !t.isTemplate).slice(0, 5);
    if (recent.length === 0) {
      answer = `Não encontrei transações recentes no seu extrato local.`;
    } else {
      const list = recent.map(t => `- **${t.description}**: ${t.type === "INCOME" ? "🟢" : "🔴"} R$ ${t.amount.toFixed(2)} em ${t.category} (${t.date})`).join("\n");
      answer = `Aqui estão os seus últimos 5 lançamentos registrados:\n\n${list}`;
    }
  } else if (textLower.match(/\b(ajuda|como usar|comandos|oque faz|o que faz)\b/i)) {
    answer = `Como usar o leitor local sem IA:\n\n` +
             `- **Para lançar despesas:** "Gastei 25 reais com Uber"\n` +
             `- **Para lançar receitas:** "Recebi 1500 de salário"\n` +
             `- **Para transferir:** "Transferi 100 do Itaú para o Nubank"\n` +
             `- **Para ver saldos:** Digite "saldo"\n` +
             `- **Para ver teto:** Digite "teto"\n` +
             `- **Para ver histórico:** Digite "extrato"\n\n` +
             `*Todas as operações acima ocorrem localmente de forma super rápida e 100% segura!*`;
  } else {
    answer = `Entendido! Estou no Modo Leitor Local. Não entendi se você quis lançar algo ou fazer uma pergunta. Para registrar um gasto ou receita, use termos como "gastei 50 no mercado" ou "recebi 100 de presente". Se tiver alguma dúvida do sistema, digite "ajuda".`;
  }

  return {
    isTransaction: false,
    answer: answer
  };
};

/**
 * Local financial insights engine. Replicates LLM output through deterministic math.
 */
export const getFinancialInsightsLocal = (
  transactions: Transaction[],
  categories: Category[] = [],
  currentUser?: User | null
): any => {
  const expenses = transactions.filter(t => t.type === 'EXPENSE' && !t.isTemplate);
  const incomes = transactions.filter(t => t.type === 'INCOME' && !t.isTemplate);
  
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncomes = incomes.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncomes - totalExpenses;

  // Resolve categories dynamically if empty
  const resolvedCategories = categories.length > 0
    ? categories
    : Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).map(name => ({
        id: name,
        name,
        type: 'EXPENSE' as const,
        userId: 'system',
        color: '#6366f1'
      }));

  // Calculate highest category expense
  const catExpenses: Record<string, number> = {};
  expenses.forEach(t => {
    catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
  });

  let topCategoryName = "";
  let topCategoryAmount = 0;
  Object.entries(catExpenses).forEach(([name, amount]) => {
    if (amount > topCategoryAmount) {
      topCategoryName = name;
      topCategoryAmount = amount;
    }
  });

  const insights: any[] = [];

  // Insight 1: Highest Expense Category
  if (topCategoryName) {
    const formattedCatAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(topCategoryAmount);
    insights.push({
      title: `Maior Gasto: ${topCategoryName}`,
      advice: `Seus maiores gastos estão concentrados em ${topCategoryName} com um acumulado de ${formattedCatAmount}. Considere definir limites de orçamento para esta categoria em Ajustes.`,
      type: "SAVING"
    });
  }

  // Insight 2: Spending limit warning
  const ceiling = currentUser?.spendingCeiling || 0;
  if (ceiling > 0) {
    const pct = (totalExpenses / ceiling) * 100;
    if (pct >= 95) {
      insights.push({
        title: "Teto de Gastos Praticamente Atingido",
        advice: `Atenção: Seus gastos de R$ ${totalExpenses.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} representam ${pct.toFixed(1)}% do seu teto de gastos de R$ ${ceiling.toLocaleString('pt-BR')}. Recomenda-se interromper gastos supérfluos imediatamente.`,
        type: "WARNING"
      });
    } else if (pct >= 80) {
      insights.push({
        title: "Aproximando-se do Limite Mensal",
        advice: `Alerta: Você consumiu ${pct.toFixed(1)}% do seu orçamento mensal (R$ ${totalExpenses.toLocaleString('pt-BR')} de R$ ${ceiling.toLocaleString('pt-BR')}). Mantenha o foco em despesas essenciais até fechar o período.`,
        type: "WARNING"
      });
    } else {
      insights.push({
        title: "Orçamento Sob Controle",
        advice: `Excelente! Seus gastos mensais estão em apenas ${pct.toFixed(1)}% do seu teto estipulado de R$ ${ceiling.toLocaleString('pt-BR')}. Continue assim!`,
        type: "SAVING"
      });
    }
  } else {
    insights.push({
      title: "Defina um Teto de Gastos",
      advice: "Você ainda não estipulou um teto de gastos mensal nas Configurações. Definir um limite global ajuda no engajamento e cria uma barreira psicológica contra compras por impulso.",
      type: "OPPORTUNITY"
    });
  }

  // Insight 3: Savings Opportunity
  if (netBalance > 0) {
    const savingsAmount = netBalance * 0.2;
    const formattedSavings = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(savingsAmount);
    insights.push({
      title: "Oportunidade de Poupança",
      advice: `Seu saldo líquido este mês é positivo em ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}. Recomendamos poupar 20% deste saldo (${formattedSavings}) aplicando em investimentos ou na poupança imediatamente.`,
      type: "OPPORTUNITY"
    });
  } else if (totalExpenses > totalIncomes && totalIncomes > 0) {
    insights.push({
      title: "Déficit Orçamentário",
      advice: `Suas despesas superaram suas receitas neste mês. Revise suas compras a prazo e procure renegociar faturas ou assinaturas não utilizadas para restaurar o equilíbrio financeiro.`,
      type: "WARNING"
    });
  }

  // Summary
  const summary = `Diagnóstico local consolidado: Suas receitas totais somam ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncomes)}, e suas despesas somam ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}. Seu saldo líquido final é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}.` + 
    (netBalance > 0 ? " Você está com as contas no azul! Parabéns!" : totalIncomes > 0 ? " Cuidado, você está gastando mais do que ganha." : " Adicione suas despesas e receitas para ver o diagnóstico completo.");

  // Suggested budgets based on actual averages
  const suggestedBudget = resolvedCategories.map(cat => {
    const currentSpent = catExpenses[cat.name] || 0;
    const recommended = currentSpent > 0 ? Math.round(currentSpent * 1.1) : 300;
    return {
      category: cat.name,
      limit: recommended
    };
  });

  return {
    insights,
    summary,
    suggestedBudget
  };
};
