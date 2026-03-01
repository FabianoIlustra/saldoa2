-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (for user data)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  avatar_color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create categories table
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null, -- 'INCOME' or 'EXPENSE'
  budget numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create accounts table
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null, -- 'Corrente', 'Poupança', etc.
  initial_balance numeric default 0,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  account_id uuid references accounts(id) on delete cascade,
  description text not null,
  amount numeric not null,
  type text not null, -- 'INCOME' or 'EXPENSE'
  category text not null,
  date date not null,
  recurrence text, -- 'MONTHLY', etc.
  is_joint boolean default false,
  is_template boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create recurring_transactions table
create table recurring_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  account_id uuid references accounts(id) on delete cascade,
  description text not null,
  amount numeric not null,
  type text not null, -- 'INCOME' or 'EXPENSE'
  category text not null,
  day_of_month integer not null,
  last_generated_date timestamp with time zone,
  active boolean default true,
  is_joint boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create goals table
create table goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table recurring_transactions enable row level security;
alter table goals enable row level security;

-- Create policies (Users can only see/edit their own data)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view own categories" on categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on categories for delete using (auth.uid() = user_id);

create policy "Users can view own accounts" on accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts" on accounts for delete using (auth.uid() = user_id);

create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on transactions for delete using (auth.uid() = user_id);

create policy "Users can view own recurring transactions" on recurring_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own recurring transactions" on recurring_transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring transactions" on recurring_transactions for update using (auth.uid() = user_id);
create policy "Users can delete own recurring transactions" on recurring_transactions for delete using (auth.uid() = user_id);

create policy "Users can view own goals" on goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on goals for delete using (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_color)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_color');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
