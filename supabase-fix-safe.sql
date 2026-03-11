-- Run this SQL in your Supabase SQL Editor to fix missing columns safely

-- 1. Add color to categories if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'color') THEN 
        ALTER TABLE categories ADD COLUMN color text; 
    END IF; 
END $$;

-- 2. Add color to goals if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'color') THEN 
        ALTER TABLE goals ADD COLUMN color text; 
    END IF; 
END $$;

-- 3. Handle 'title' vs 'name' in goals
DO $$ 
BEGIN 
    -- Check if 'title' exists and 'name' does not
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'title') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'name') THEN
        ALTER TABLE goals RENAME COLUMN title TO name;
    
    -- If 'name' doesn't exist (and title also doesn't, which is weird but possible if table is empty/new), add it
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'name') THEN
        ALTER TABLE goals ADD COLUMN name text;
    END IF;
END $$;
