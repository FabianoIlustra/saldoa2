-- Run this SQL in your Supabase SQL Editor to fix missing columns

-- Add color to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color text;

-- Rename title to name in goals (or add name if you prefer to keep title)
ALTER TABLE goals RENAME COLUMN title TO name;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS color text;

-- Add avatar_url to profiles if needed (code uses avatarColor)
-- profiles already has avatar_color
