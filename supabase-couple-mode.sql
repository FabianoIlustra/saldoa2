-- Enable Couple Mode Support

-- 1. Add couple_id to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS couple_id UUID;
CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON profiles(couple_id);

-- 2. Helper function to check couple membership efficiently
CREATE OR REPLACE FUNCTION is_couple_member(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Returns true if the resource owner is the user themselves OR if they share a couple_id
    RETURN (auth.uid() = resource_user_id) OR EXISTS (
        SELECT 1 FROM profiles p1, profiles p2 
        WHERE p1.id = auth.uid() 
        AND p2.id = resource_user_id 
        AND p1.couple_id = p2.couple_id 
        AND p1.couple_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS Policies to allow shared access

-- Profiles: View self and partner
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own and partner profile" ON profiles
    FOR SELECT USING (is_couple_member(id));

-- Accounts
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
CREATE POLICY "Users can manage own and partner accounts" ON accounts
    FOR ALL USING (is_couple_member(user_id));

-- Categories
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own and partner categories" ON categories
    FOR ALL USING (is_couple_member(user_id));

-- Goals
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
CREATE POLICY "Users can manage own and partner goals" ON goals
    FOR ALL USING (is_couple_member(user_id));

-- Transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own and partner transactions" ON transactions
    FOR ALL USING (is_couple_member(user_id));

-- Recurring Transactions
DROP POLICY IF EXISTS "Users can manage own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can manage own and partner recurring transactions" ON recurring_transactions
    FOR ALL USING (is_couple_member(user_id));

-- 4. Function to easily link users by email (Run this in SQL Editor with specific emails)
CREATE OR REPLACE FUNCTION link_users(email1 TEXT, email2 TEXT)
RETURNS TEXT AS $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    new_couple_id UUID;
BEGIN
    SELECT id INTO user1_id FROM auth.users WHERE email = email1;
    SELECT id INTO user2_id FROM auth.users WHERE email = email2;

    IF user1_id IS NULL OR user2_id IS NULL THEN
        RETURN 'Erro: Um ou ambos os emails não foram encontrados.';
    END IF;

    -- Check if already linked
    IF EXISTS (SELECT 1 FROM profiles WHERE id = user1_id AND couple_id IS NOT NULL) THEN
         SELECT couple_id INTO new_couple_id FROM profiles WHERE id = user1_id;
    ELSIF EXISTS (SELECT 1 FROM profiles WHERE id = user2_id AND couple_id IS NOT NULL) THEN
         SELECT couple_id INTO new_couple_id FROM profiles WHERE id = user2_id;
    ELSE
         new_couple_id := uuid_generate_v4();
    END IF;

    UPDATE profiles SET couple_id = new_couple_id WHERE id IN (user1_id, user2_id);
    
    RETURN 'Usuários vinculados com sucesso! Agora eles compartilham os dados.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
