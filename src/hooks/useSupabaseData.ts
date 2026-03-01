import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category, RecurringTransaction, Goal } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useSupabaseData = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setRecurringTransactions([]);
      setGoals([]);
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, accRes, catRes, recRes, goalRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('accounts').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('recurring_transactions').select('*'),
        supabase.from('goals').select('*')
      ]);

      if (transRes.data) setTransactions(transRes.data);
      if (accRes.data) setAccounts(accRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (recRes.data) setRecurringTransactions(recRes.data);
      if (goalRes.data) setGoals(goalRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transactions
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('transactions').insert([{ ...transaction, user_id: user.id }]).select().single();
    if (data) setTransactions(prev => [data, ...prev]);
    if (error) console.error('Error adding transaction:', error);
  };

  const updateTransaction = async (transaction: Transaction) => {
    if (!user) return;
    const { error } = await supabase.from('transactions').update(transaction).eq('id', transaction.id);
    if (!error) {
      setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
    } else {
      console.error('Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    } else {
      console.error('Error deleting transaction:', error);
    }
  };

  // Accounts
  const addAccount = async (account: Omit<Account, 'id' | 'user_id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('accounts').insert([{ ...account, user_id: user.id }]).select().single();
    if (data) setAccounts(prev => [...prev, data]);
    if (error) console.error('Error adding account:', error);
  };

  const updateAccount = async (account: Account) => {
    if (!user) return;
    const { error } = await supabase.from('accounts').update(account).eq('id', account.id);
    if (!error) {
      setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
    } else {
      console.error('Error updating account:', error);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (!error) {
      setAccounts(prev => prev.filter(a => a.id !== id));
    } else {
      console.error('Error deleting account:', error);
    }
  };

  // Categories
  const addCategory = async (category: Omit<Category, 'id' | 'user_id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('categories').insert([{ ...category, user_id: user.id }]).select().single();
    if (data) setCategories(prev => [...prev, data]);
    if (error) console.error('Error adding category:', error);
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
    } else {
      console.error('Error deleting category:', error);
    }
  };

  // Recurring Transactions
  const addRecurringTransaction = async (recurring: Omit<RecurringTransaction, 'id' | 'user_id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('recurring_transactions').insert([{ ...recurring, user_id: user.id }]).select().single();
    if (data) setRecurringTransactions(prev => [...prev, data]);
    if (error) console.error('Error adding recurring transaction:', error);
  };

  const updateRecurringTransaction = async (recurring: RecurringTransaction) => {
    if (!user) return;
    const { error } = await supabase.from('recurring_transactions').update(recurring).eq('id', recurring.id);
    if (!error) {
      setRecurringTransactions(prev => prev.map(r => r.id === recurring.id ? recurring : r));
    } else {
      console.error('Error updating recurring transaction:', error);
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (!error) {
      setRecurringTransactions(prev => prev.filter(r => r.id !== id));
    } else {
      console.error('Error deleting recurring transaction:', error);
    }
  };

  // Goals
  const addGoal = async (goal: Omit<Goal, 'id' | 'user_id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('goals').insert([{ ...goal, user_id: user.id }]).select().single();
    if (data) setGoals(prev => [...prev, data]);
    if (error) console.error('Error adding goal:', error);
  };

  const updateGoal = async (goal: Goal) => {
    if (!user) return;
    const { error } = await supabase.from('goals').update(goal).eq('id', goal.id);
    if (!error) {
      setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
    } else {
      console.error('Error updating goal:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== id));
    } else {
      console.error('Error deleting goal:', error);
    }
  };

  return {
    transactions,
    accounts,
    categories,
    recurringTransactions,
    goals,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    addGoal,
    updateGoal,
    deleteGoal
  };
};
