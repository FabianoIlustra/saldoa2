import { supabase } from '../lib/supabaseClient';
import { Transaction, Account, Category, Goal, RecurringTransaction, User } from '../types';

export const supabaseService = {
  // Profiles
  async getProfile() {
    const { data, error } = await supabase.from('profiles').select('*').single();
    if (error) throw error;
    return data;
  },

  async updateProfile(profile: Partial<User>) {
    const { data, error } = await supabase.from('profiles').update({
      name: profile.name,
      avatar_color: profile.avatarColor
    }).eq('id', (await supabase.auth.getUser()).data.user?.id);
    if (error) throw error;
    return data;
  },

  // Categories
  async getCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return data.map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      type: c.type,
      budget: c.budget,
      createdAt: c.created_at
    }));
  },

  async addCategory(category: Omit<Category, 'id'>) {
    const { data, error } = await supabase.from('categories').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      name: category.name,
      type: category.type,
      budget: category.budget
    }).select().single();
    if (error) throw error;
    return { ...category, id: data.id };
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // Accounts
  async getAccounts() {
    const { data, error } = await supabase.from('accounts').select('*');
    if (error) throw error;
    return data.map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      name: a.name,
      type: a.type,
      initialBalance: a.initial_balance,
      currentBalance: a.initial_balance, // Supabase doesn't store currentBalance, need to calc
      color: a.color
    }));
  },

  async addAccount(account: Omit<Account, 'id' | 'currentBalance'>) {
    const { data, error } = await supabase.from('accounts').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      name: account.name,
      type: account.type,
      initial_balance: account.initialBalance,
      color: account.color
    }).select().single();
    if (error) throw error;
    return { ...account, id: data.id, currentBalance: account.initialBalance };
  },

  async updateAccount(account: Account) {
    const { error } = await supabase.from('accounts').update({
      name: account.name,
      type: account.type,
      initial_balance: account.initialBalance,
      color: account.color
    }).eq('id', account.id);
    if (error) throw error;
  },

  async deleteAccount(id: string) {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
  },

  // Transactions
  async getTransactions() {
    const { data, error } = await supabase.from('transactions').select('*');
    if (error) throw error;
    return data.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      accountId: t.account_id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date,
      recurrence: t.recurrence,
      isJoint: t.is_joint,
      isTemplate: t.is_template
    }));
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>) {
    const { data, error } = await supabase.from('transactions').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      account_id: transaction.accountId,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      recurrence: transaction.recurrence,
      is_joint: transaction.isJoint,
      is_template: transaction.isTemplate
    }).select().single();
    if (error) throw error;
    return { ...transaction, id: data.id };
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // Goals
  async getGoals() {
    const { data, error } = await supabase.from('goals').select('*');
    if (error) throw error;
    return data.map((g: any) => ({
      id: g.id,
      userId: g.user_id,
      title: g.title,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      deadline: g.deadline
    }));
  },

  async addGoal(goal: Omit<Goal, 'id'>) {
    const { data, error } = await supabase.from('goals').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      title: goal.title,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline
    }).select().single();
    if (error) throw error;
    return { ...goal, id: data.id };
  },

  async updateGoal(goal: Goal) {
    const { error } = await supabase.from('goals').update({
      title: goal.title,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline
    }).eq('id', goal.id);
    if (error) throw error;
  },

  async deleteGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  },

  // Recurring Transactions
  async getRecurringTransactions() {
    const { data, error } = await supabase.from('recurring_transactions').select('*');
    if (error) throw error;
    return data.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      accountId: r.account_id,
      description: r.description,
      amount: r.amount,
      type: r.type,
      category: r.category,
      dayOfMonth: r.day_of_month,
      lastGeneratedDate: r.last_generated_date,
      active: r.active,
      isJoint: r.is_joint
    }));
  },

  async addRecurringTransaction(recurring: Omit<RecurringTransaction, 'id'>) {
    const { data, error } = await supabase.from('recurring_transactions').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      account_id: recurring.accountId,
      description: recurring.description,
      amount: recurring.amount,
      type: recurring.type,
      category: recurring.category,
      day_of_month: recurring.dayOfMonth,
      last_generated_date: recurring.lastGeneratedDate,
      active: recurring.active,
      is_joint: recurring.isJoint
    }).select().single();
    if (error) throw error;
    return { ...recurring, id: data.id };
  },

  async updateRecurringTransaction(recurring: RecurringTransaction) {
    const { error } = await supabase.from('recurring_transactions').update({
      description: recurring.description,
      amount: recurring.amount,
      type: recurring.type,
      category: recurring.category,
      day_of_month: recurring.dayOfMonth,
      last_generated_date: recurring.lastGeneratedDate,
      active: recurring.active,
      is_joint: recurring.isJoint
    }).eq('id', recurring.id);
    if (error) throw error;
  },

  async deleteRecurringTransaction(id: string) {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;
  }
};
