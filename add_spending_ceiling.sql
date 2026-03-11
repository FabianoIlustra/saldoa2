-- Run this command in your Supabase SQL Editor to add the missing column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS spending_ceiling numeric;

-- Verify the name column exists (it should, based on your screenshot)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
