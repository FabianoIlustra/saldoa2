import { Transaction, Account, Category, Goal, RecurringTransaction, User } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const STORAGE_KEYS = {
  USERS: 'finan_ai_users',
  CATEGORIES: 'finan_ai_categories',
  ACCOUNTS: 'finan_ai_accounts',
  TRANSACTIONS: 'finan_ai_all_transactions',
  GOALS: 'finan_ai_goals',
  RECURRING: 'finan_ai_recurring_transactions',
  CURRENT_USER: 'finan_ai_current_user'
};

const get = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const set = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const localService = {
  // Profiles
  async getProfile() {
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    const currentUser = get<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    
    if (currentUser) return { ...currentUser, avatar_color: currentUser.avatarColor };
    if (users.length > 0) return { ...users[0], avatar_color: users[0].avatarColor };
    
    // Create default guest user
    const guestUser: User = { id: 'guest', name: 'Convidado', avatarColor: '#6366f1' };
    set(STORAGE_KEYS.USERS, [guestUser]);
    set(STORAGE_KEYS.CURRENT_USER, guestUser);
    return { ...guestUser, avatar_color: guestUser.avatarColor };
  },

  async updateProfile(profile: Partial<User>) {
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    const currentUser = get<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    
    if (!currentUser) throw new Error('No user logged in');

    const updatedUser = { ...currentUser, ...profile };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    
    set(STORAGE_KEYS.USERS, updatedUsers);
    set(STORAGE_KEYS.CURRENT_USER, updatedUser);
    
    return { ...updatedUser, avatar_color: updatedUser.avatarColor };
  },

  // Categories
  async getCategories() {
    const cats = get<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    return cats.map(c => ({
      ...c,
      userId: 'guest',
      budget: c.budget || 0,
      createdAt: new Date().toISOString()
    }));
  },

  async addCategory(category: Omit<Category, 'id'>) {
    const cats = get<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    const newCat = { ...category, id: Math.random().toString(36).substr(2, 9) };
    set(STORAGE_KEYS.CATEGORIES, [...cats, newCat]);
    return newCat;
  },

  async deleteCategory(id: string) {
    const cats = get<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    set(STORAGE_KEYS.CATEGORIES, cats.filter(c => c.id !== id));
  },

  // Accounts
  async getAccounts() {
    const accs = get<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    return accs.map(a => ({
      ...a,
      userId: 'guest',
      initial_balance: a.initialBalance
    }));
  },

  async addAccount(account: Omit<Account, 'id' | 'currentBalance'>) {
    const accs = get<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    const newAcc = { 
      ...account, 
      id: Math.random().toString(36).substr(2, 9),
      currentBalance: account.initialBalance
    };
    set(STORAGE_KEYS.ACCOUNTS, [...accs, newAcc]);
    return newAcc;
  },

  async updateAccount(account: Account) {
    const accs = get<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    set(STORAGE_KEYS.ACCOUNTS, accs.map(a => a.id === account.id ? account : a));
  },

  async deleteAccount(id: string) {
    const accs = get<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    set(STORAGE_KEYS.ACCOUNTS, accs.filter(a => a.id !== id));
  },

  // Transactions
  async getTransactions() {
    const trans = get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    return trans.map(t => ({
      ...t,
      userId: 'guest',
      is_joint: t.isJoint,
      is_template: t.isTemplate
    }));
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>) {
    const trans = get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const newTrans = { ...transaction, id: Math.random().toString(36).substr(2, 9) };
    set(STORAGE_KEYS.TRANSACTIONS, [newTrans, ...trans]);
    return newTrans;
  },

  async deleteTransaction(id: string) {
    const trans = get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    set(STORAGE_KEYS.TRANSACTIONS, trans.filter(t => t.id !== id));
  },

  // Goals
  async getGoals() {
    const goals = get<Goal[]>(STORAGE_KEYS.GOALS, []);
    return goals.map(g => ({
      ...g,
      userId: 'guest',
      target_amount: g.targetAmount,
      current_amount: g.currentAmount
    }));
  },

  async addGoal(goal: Omit<Goal, 'id'>) {
    const goals = get<Goal[]>(STORAGE_KEYS.GOALS, []);
    const newGoal = { ...goal, id: Math.random().toString(36).substr(2, 9) };
    set(STORAGE_KEYS.GOALS, [...goals, newGoal]);
    return newGoal;
  },

  async updateGoal(goal: Goal) {
    const goals = get<Goal[]>(STORAGE_KEYS.GOALS, []);
    set(STORAGE_KEYS.GOALS, goals.map(g => g.id === goal.id ? goal : g));
  },

  async deleteGoal(id: string) {
    const goals = get<Goal[]>(STORAGE_KEYS.GOALS, []);
    set(STORAGE_KEYS.GOALS, goals.filter(g => g.id !== id));
  },

  // Recurring Transactions
  async getRecurringTransactions() {
    const recur = get<RecurringTransaction[]>(STORAGE_KEYS.RECURRING, []);
    return recur.map(r => ({
      ...r,
      userId: 'guest',
      day_of_month: r.dayOfMonth,
      last_generated_date: r.lastGeneratedDate,
      is_joint: r.isJoint
    }));
  },

  async addRecurringTransaction(recurring: Omit<RecurringTransaction, 'id'>) {
    const recur = get<RecurringTransaction[]>(STORAGE_KEYS.RECURRING, []);
    const newRec = { ...recurring, id: Math.random().toString(36).substr(2, 9) };
    set(STORAGE_KEYS.RECURRING, [...recur, newRec]);
    return newRec;
  },

  async updateRecurringTransaction(recurring: RecurringTransaction) {
    const recur = get<RecurringTransaction[]>(STORAGE_KEYS.RECURRING, []);
    set(STORAGE_KEYS.RECURRING, recur.map(r => r.id === recurring.id ? recurring : r));
  },

  async deleteRecurringTransaction(id: string) {
    const recur = get<RecurringTransaction[]>(STORAGE_KEYS.RECURRING, []);
    set(STORAGE_KEYS.RECURRING, recur.filter(r => r.id !== id));
  }
};
