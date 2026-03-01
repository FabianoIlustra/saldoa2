export interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CASH' | 'CREDIT_CARD';
  initialBalance: number;
  currentBalance?: number; // Calculated field
  color: string;
  userId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  budget?: number;
  userId?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  accountId: string;
  userId: string;
  isJoint?: boolean;
  recurrence?: 'MONTHLY' | 'WEEKLY' | 'YEARLY';
  isTemplate?: boolean;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  dayOfMonth: number;
  accountId: string;
  lastGeneratedDate?: string;
  active: boolean;
  isJoint?: boolean;
  userId?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  userId?: string;
}
