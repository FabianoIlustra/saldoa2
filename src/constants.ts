
import { Transaction, Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Salário', type: 'INCOME', color: '#10b981' },
  { id: '2', name: 'Alimentação', type: 'EXPENSE', color: '#f59e0b' },
  { id: '3', name: 'Moradia', type: 'EXPENSE', color: '#3b82f6' },
  { id: '4', name: 'Transporte', type: 'EXPENSE', color: '#6366f1' },
  { id: '5', name: 'Lazer', type: 'EXPENSE', color: '#ec4899' },
  { id: '6', name: 'Educação', type: 'EXPENSE', color: '#8b5cf6' },
  { id: '7', name: 'Saúde', type: 'EXPENSE', color: '#ef4444' },
  { id: '8', name: 'Investimentos', type: 'EXPENSE', color: '#06b6d4' },
  { id: '9', name: 'Outros', type: 'EXPENSE', color: '#94a3b8' },
  { id: '10', name: 'Renda Extra', type: 'INCOME', color: '#8b5cf6' }
];

export const CATEGORIES = DEFAULT_CATEGORIES.map(c => c.name);

export const getRandomColor = () => {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#8b5cf6'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Added required accountId property to match the Transaction interface
  { id: '1', userId: 'default', accountId: 'default', description: 'Salário Mensal', amount: 5000, type: 'INCOME', category: 'Salário', date: '2023-10-01' },
  { id: '2', userId: 'default', accountId: 'default', description: 'Aluguel', amount: 1500, type: 'EXPENSE', category: 'Moradia', date: '2023-10-05' },
  { id: '3', userId: 'default', accountId: 'default', description: 'Supermercado', amount: 800, type: 'EXPENSE', category: 'Alimentação', date: '2023-10-10' },
  { id: '4', userId: 'default', accountId: 'default', description: 'Freelance Design', amount: 1200, type: 'INCOME', category: 'Outros', date: '2023-10-15' },
  { id: '5', userId: 'default', accountId: 'default', description: 'Academia', amount: 150, type: 'EXPENSE', category: 'Saúde', date: '2023-10-20' },
];
