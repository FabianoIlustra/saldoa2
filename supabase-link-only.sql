-- Script APENAS para vincular o casal (sem recriar políticas)
-- Substitua os e-mails abaixo e rode no SQL Editor

DO $$
DECLARE
    -- !!! COLOQUE OS DOIS E-MAILS AQUI !!!
    email1 TEXT := 'fabianofreitasfoto@hotmail.com';
    email2 TEXT := 'contatoilustra@hotmail.com'; -- Substitua pelo segundo e-mail correto
    
    user1_id UUID;
    user2_id UUID;
    new_couple_id UUID;
BEGIN
    -- Busca os IDs
    SELECT id INTO user1_id FROM auth.users WHERE email = email1;
    SELECT id INTO user2_id FROM auth.users WHERE email = email2;

    -- Verifica se encontrou os dois
    IF user1_id IS NULL THEN
        RAISE NOTICE 'ERRO: O e-mail % não foi encontrado no sistema.', email1;
    ELSIF user2_id IS NULL THEN
        RAISE NOTICE 'ERRO: O e-mail % não foi encontrado no sistema.', email2;
    ELSE
        -- Gera um ID único para o casal
        new_couple_id := uuid_generate_v4();
        
        -- Atualiza os dois perfis com o mesmo ID de casal
        UPDATE profiles SET couple_id = new_couple_id WHERE id IN (user1_id, user2_id);
        
        RAISE NOTICE 'SUCESSO! % e % foram vinculados.', email1, email2;
    END IF;
END $$;
