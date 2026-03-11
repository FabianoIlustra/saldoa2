-- ATENÇÃO: Este script apaga TODOS os dados financeiros do sistema.
-- Execute-o no SQL Editor do Supabase apenas se tiver certeza.

-- 1. Apaga todos os lançamentos (Receitas e Despesas)
DELETE FROM public.transactions;

-- 2. Apaga todas as recorrências (Contas Fixas)
DELETE FROM public.recurring_transactions;

-- 3. Apaga todas as metas financeiras
DELETE FROM public.goals;

-- 4. Apaga todas as contas bancárias cadastradas (e seus saldos)
DELETE FROM public.accounts;

-- 5. Apaga todas as categorias cadastradas
DELETE FROM public.categories;

-- 6. Zera o "Teto de Gastos" de todos os perfis, mas MANTÉM os usuários e seus nomes
UPDATE public.profiles SET spending_ceiling = NULL;

-- Opcional: Se quiser zerar também o avatar_color ou outros campos, adicione aqui.
-- Exemplo: UPDATE public.profiles SET avatar_color = NULL;
