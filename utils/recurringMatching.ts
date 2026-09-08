import { format, parseISO, isSameMonth, isSameYear, isSameDay } from 'date-fns';
import { RecurringTransaction, Transaction } from '../types';

export interface ConfirmedOccurrenceRecord {
  recurringId: string;
  confirmedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paidTransactionId?: string;
  amount?: number;
  description?: string;
  ignored?: boolean;
}

const STORAGE_KEY = 'finan_ai_confirmed_recurring';

// Helper to remove accents and special characters
export function normalizeBankingText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Noise words common in Brazilian bank statements
const BANKING_NOISE_WORDS = new Set([
  'pix', 'ted', 'doc', 'pgto', 'pagto', 'pagamento', 'deb', 'debito', 'transf',
  'transferencia', 'bol', 'boleto', 'compra', 'fatura', 'rec', 'recebimento',
  'dep', 'deposito', 'saque', 'aut', 'automatica', 'automatico', 'agendamento',
  'agendado', 'cartao', 'credito', 'estorno', 'banco', 's', 'a', 'ltda', 'me',
  'epp', 'sa', 'envio', 'receb', 'via', 'int', 'app', 'qr', 'code', 'qrcode'
]);

export function cleanBankingTokens(text: string): string[] {
  const normalized = normalizeBankingText(text);
  return normalized
    .split(' ')
    .filter(token => token.length >= 2 && !BANKING_NOISE_WORDS.has(token));
}

// Check if two texts have strong financial similarity
export function isBankingTextSimilar(statementText: string, recurringDesc: string): boolean {
  if (!statementText || !recurringDesc) return false;

  const normStmt = normalizeBankingText(statementText);
  const normRec = normalizeBankingText(recurringDesc);

  if (normStmt === normRec) return true;

  // Substring match
  if (normRec.length >= 3 && normStmt.includes(normRec)) return true;
  if (normStmt.length >= 3 && normRec.includes(normStmt)) return true;

  // Compare cleaned meaningful tokens
  const stmtTokens = cleanBankingTokens(statementText);
  const recTokens = cleanBankingTokens(recurringDesc);

  if (recTokens.length === 0 || stmtTokens.length === 0) {
    return false;
  }

  // If all significant words of recurring are in the statement
  const allRecInStmt = recTokens.every(t => stmtTokens.some(st => st.includes(t) || t.includes(st)));
  if (allRecInStmt) return true;

  // If any high-value keyword matches (length >= 4)
  const hasStrongTokenMatch = recTokens.some(rt => 
    rt.length >= 4 && stmtTokens.some(st => st === rt || (st.length >= 4 && (st.includes(rt) || rt.includes(st))))
  );
  if (hasStrongTokenMatch) return true;

  return false;
}

// Storage helpers
export function getConfirmedRecurringMap(): Record<string, ConfirmedOccurrenceRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Error reading confirmed recurring map from localStorage', err);
    return {};
  }
}

export function saveConfirmedRecurringOccurrence(
  recurringId: string,
  dueDate: Date | string,
  details: {
    confirmedDate: string;
    paidTransactionId?: string;
    amount?: number;
    description?: string;
    ignored?: boolean;
  }
) {
  try {
    const dueObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    const dateStr = format(dueObj, 'yyyy-MM-dd');
    const monthStr = format(dueObj, 'yyyy-MM');

    const map = getConfirmedRecurringMap();
    const record: ConfirmedOccurrenceRecord = {
      recurringId,
      confirmedDate: details.confirmedDate,
      dueDate: dateStr,
      paidTransactionId: details.paidTransactionId,
      amount: details.amount,
      description: details.description,
      ignored: details.ignored
    };

    // Save with primary keys
    map[`${recurringId}-${dateStr}`] = record;
    map[`${recurringId}-${monthStr}`] = record;

    if (details.paidTransactionId) {
      map[`tx-${details.paidTransactionId}`] = record;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('recurring-status-changed', { detail: { recurringId, dueDate: dateStr } }));
  } catch (err) {
    console.warn('Error saving confirmed recurring occurrence', err);
  }
}

export function removeConfirmedRecurringOccurrence(
  recurringId: string,
  dueDate: Date | string,
  paidTransactionId?: string
) {
  try {
    const dueObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    const dateStr = format(dueObj, 'yyyy-MM-dd');
    const monthStr = format(dueObj, 'yyyy-MM');

    const map = getConfirmedRecurringMap();
    delete map[`${recurringId}-${dateStr}`];
    delete map[`${recurringId}-${monthStr}`];

    if (paidTransactionId) {
      delete map[`tx-${paidTransactionId}`];
    }

    // Clean any related key
    Object.keys(map).forEach(key => {
      if (key.startsWith(recurringId) && (key.includes(dateStr) || key.includes(monthStr))) {
        delete map[key];
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('recurring-status-changed', { detail: { recurringId, dueDate: dateStr } }));
  } catch (err) {
    console.warn('Error removing confirmed recurring occurrence', err);
  }
}

// Main check function
export function checkIsRecurringPaid(
  recurring: RecurringTransaction,
  dueDate: Date,
  transactions: Transaction[]
): {
  isPaid: boolean;
  isIgnored?: boolean;
  transaction?: Transaction;
  confirmedDate?: Date;
  paidTransactionId?: string;
} {
  const dateStr = format(dueDate, 'yyyy-MM-dd');
  const monthStr = format(dueDate, 'yyyy-MM');
  const recId = recurring.id;

  // 1. Check LocalStorage Confirmed Registry
  const confirmedMap = getConfirmedRecurringMap();
  const confirmedRecord = 
    confirmedMap[`${recId}-${dateStr}`] ||
    confirmedMap[`${recId}-${monthStr}`] ||
    (recurring as any).originalId && (
      confirmedMap[`${(recurring as any).originalId}-${dateStr}`] ||
      confirmedMap[`${(recurring as any).originalId}-${monthStr}`]
    );

  if (confirmedRecord) {
    if (confirmedRecord.ignored) {
      return { isPaid: true, isIgnored: true };
    }

    // Find the linked transaction if any
    let linkedTx: Transaction | undefined;
    if (confirmedRecord.paidTransactionId) {
      linkedTx = transactions.find(t => t.id === confirmedRecord.paidTransactionId);
    }
    if (!linkedTx) {
      // Find by matching date/description/type
      linkedTx = transactions.find(t => {
        if (t.isTemplate) return false;
        if (t.type !== recurring.type) return false;
        return isBankingTextSimilar(t.description, recurring.description);
      });
    }

    let parsedConfirmedDate: Date = dueDate;
    try {
      if (confirmedRecord.confirmedDate) {
        parsedConfirmedDate = parseISO(confirmedRecord.confirmedDate);
      } else if (linkedTx?.date) {
        parsedConfirmedDate = parseISO(linkedTx.date);
      }
    } catch {
      parsedConfirmedDate = dueDate;
    }

    return {
      isPaid: true,
      transaction: linkedTx,
      confirmedDate: parsedConfirmedDate,
      paidTransactionId: confirmedRecord.paidTransactionId || linkedTx?.id
    };
  }

  // 2. Check Direct Link (recurringTransactionId) in transactions
  const directTx = transactions.find(t => {
    if (t.isTemplate) return false;
    if (t.type !== recurring.type) return false;

    const hasDirectLink = t.recurringTransactionId && (
      t.recurringTransactionId === recId ||
      t.recurringTransactionId === (recurring as any).originalId ||
      t.recurringTransactionId === `${recId}-${dateStr}` ||
      t.recurringTransactionId === `${recId}-${monthStr}`
    );

    if (!hasDirectLink) return false;

    // Check if within reasonable date window (same month OR within 35 days)
    const tDate = parseISO(t.date);
    const diffDays = Math.abs((tDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return isSameMonth(tDate, dueDate) || diffDays <= 35;
  });

  if (directTx) {
    let confDate = dueDate;
    try {
      confDate = parseISO(directTx.createdAt ? directTx.createdAt.split('T')[0] : directTx.date);
    } catch {
      confDate = parseISO(directTx.date);
    }
    return {
      isPaid: true,
      transaction: directTx,
      confirmedDate: confDate,
      paidTransactionId: directTx.id
    };
  }

  // 3. Smart Extrato Auto-Matching (Automatic Identification from Extrato)
  const isInterval = recurring.frequencyType === 'DAYS' || (recurring.intervalDays && recurring.intervalDays > 0);
  const maxDayDiff = isInterval ? Math.max(4, Math.floor((recurring.intervalDays || 15) / 2)) : 15;

  const matchedTx = transactions.find(t => {
    if (t.isTemplate) return false;
    if (t.type !== recurring.type) return false;

    const tDate = parseISO(t.date);
    const dayDiff = Math.abs((tDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Date proximity condition
    let dateMatches = false;
    if (isInterval) {
      dateMatches = dayDiff <= maxDayDiff;
    } else {
      // Monthly: matches same calendar month OR within 15 days of due date (handles cross-month payments)
      dateMatches = isSameMonth(tDate, dueDate) || dayDiff <= 15;
    }

    if (!dateMatches) return false;

    // A. Description similarity check
    const textMatches = isBankingTextSimilar(t.description, recurring.description);
    if (textMatches) {
      // If recurring amount is zero or not defined, any amount matches
      if (!recurring.amount || recurring.amount <= 0) return true;

      // Exact amount match
      if (Math.abs(t.amount - recurring.amount) < 0.05) return true;

      // Reasonable variance match for bills that fluctuate (e.g. electric, water, credit card)
      // Allow +/- 50% or within R$ 300
      const amountDiff = Math.abs(t.amount - recurring.amount);
      const percentDiff = amountDiff / recurring.amount;
      if (percentDiff <= 0.5 || amountDiff <= 300) {
        return true;
      }
    }

    // B. Category + Exact Amount check (for transactions with non-matching banking codes)
    if (t.category && recurring.category && t.category === recurring.category) {
      if (recurring.amount > 0 && Math.abs(t.amount - recurring.amount) < 0.05 && dayDiff <= 5) {
        return true;
      }
    }

    return false;
  });

  if (matchedTx) {
    let confDate = dueDate;
    try {
      confDate = parseISO(matchedTx.createdAt ? matchedTx.createdAt.split('T')[0] : matchedTx.date);
    } catch {
      confDate = parseISO(matchedTx.date);
    }
    return {
      isPaid: true,
      transaction: matchedTx,
      confirmedDate: confDate,
      paidTransactionId: matchedTx.id
    };
  }

  return { isPaid: false };
}
