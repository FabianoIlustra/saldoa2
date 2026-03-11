-- Script para forçar a exclusão do usuário e seus dados
-- Rode isso no SQL Editor do Supabase

DO $$
DECLARE
    target_email TEXT := 'fabianofreitasfoto@hotmail.com';
    target_user_id UUID;
BEGIN
    -- Busca o ID do usuário pelo email
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- Deleta dados das tabelas públicas (filhas primeiro para evitar erro de chave estrangeira)
        DELETE FROM public.transactions WHERE user_id = target_user_id;
        DELETE FROM public.recurring_transactions WHERE user_id = target_user_id;
        DELETE FROM public.goals WHERE user_id = target_user_id;
        DELETE FROM public.categories WHERE user_id = target_user_id;
        DELETE FROM public.accounts WHERE user_id = target_user_id;
        DELETE FROM public.profiles WHERE id = target_user_id;

        -- Finalmente deleta o usuário do sistema de autenticação
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'Usuário % deletado com sucesso', target_email;
    ELSE
        RAISE NOTICE 'Usuário % não encontrado', target_email;
    END IF;
END $$;
