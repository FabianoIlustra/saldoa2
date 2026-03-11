-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_color text,
  spending_ceiling numeric,
  couple_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories Table
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text,
  type text default 'EXPENSE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Accounts Table
create table if not exists public.accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  initial_balance numeric default 0,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Recurring Transactions Table
create table if not exists public.recurring_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts(id) on delete set null,
  description text not null,
  amount numeric not null,
  type text not null,
  category text,
  day_of_month integer not null,
  last_generated_date timestamp with time zone,
  active boolean default true,
  is_joint boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions Table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts(id) on delete set null,
  description text not null,
  amount numeric not null,
  type text not null,
  category text,
  date timestamp with time zone not null,
  recurrence text default 'NONE',
  is_joint boolean default false,
  is_template boolean default false,
  recurring_transaction_id uuid references public.recurring_transactions(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Goals Table
create table if not exists public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline timestamp with time zone,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Optional but recommended)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.recurring_transactions enable row level security;

-- Simple policies for authenticated users (can be refined)
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories for delete using (auth.uid() = user_id);

create policy "Users can view own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts" on public.accounts for delete using (auth.uid() = user_id);

create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

create policy "Users can view own recurring transactions" on public.recurring_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own recurring transactions" on public.recurring_transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring transactions" on public.recurring_transactions for update using (auth.uid() = user_id);
create policy "Users can delete own recurring transactions" on public.recurring_transactions for delete using (auth.uid() = user_id);
