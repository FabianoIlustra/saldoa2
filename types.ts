
export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceType = 'NONE' | 'MONTHLY';

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  pin?: string;
  spendingCeiling?: number;
  coupleId?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'Corrente' | 'Poupança' | 'Investimento' | 'Dinheiro';
  initialBalance: number;
  currentBalance: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type?: 'INCOME' | 'EXPENSE';
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  history?: {
    date: string;
    amount: number;
  }[];
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  createdAt?: string; // Added for launch date
  recurrence?: RecurrenceType;
  isTemplate?: boolean;
  isJoint?: boolean;
  recurringTransactionId?: string; // Link to the recurring rule
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  dayOfMonth: number; // 1-31
  lastGeneratedDate?: string;
  active: boolean;
  isJoint?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface FinancialAnalysis {
  insights: {
    title: string;
    advice: string;
    type: 'SAVING' | 'WARNING' | 'OPPORTUNITY';
  }[];
  summary: string;
  suggestedBudget: {
    category: string;
    limit: number;
  }[];
}
