-- =====================================================================
-- Corrige a permissão de finalizar_compra — e me mostra o resultado
-- =====================================================================
-- Rodar no SQL Editor com o editor vazio e NADA selecionado.
--
-- O app respondeu "permission denied for function finalizar_compra".
-- Duas causas dão essa mesma mensagem:
--   a) o grant para `authenticated` não foi aplicado;
--   b) a chamada está chegando como `anon`, e não como `authenticated`.
--
-- A linha de grant abaixo resolve (a). As duas seguintes medem o estado
-- real e escrevem num campo que eu consigo ler pela API — website_url da
-- Akea, que não aparece em tela nenhuma da vitrine. Assim eu descubro se
-- foi (a) ou (b) sem você transcrever nada.
--
-- Não uso uma tabela nova de propósito: o cache de schema do PostgREST
-- demora a enxergar objeto recém-criado, e foi isso que nos custou duas
-- rodadas mais cedo. Campo de tabela que já existe eu leio na hora.
--
-- PARA LIMPAR depois que eu ler:
--   update brands set website_url = null where name = 'Akea';
-- =====================================================================

grant execute on function public.finalizar_compra(uuid[], text, boolean) to authenticated;

update brands
set website_url =
      'exec_authenticated=' ||
        has_function_privilege('authenticated',
          'public.finalizar_compra(uuid[], text, boolean)', 'EXECUTE')::text
   || ' | exec_anon=' ||
        has_function_privilege('anon',
          'public.finalizar_compra(uuid[], text, boolean)', 'EXECUTE')::text
   || ' | acl=' ||
        coalesce((select array_to_string(proacl::text[], ' ')
                    from pg_proc
                   where proname = 'finalizar_compra'
                     and pronamespace = 'public'::regnamespace), 'nulo')
where name = 'Akea';

-- Conferência — última consulta, é o que o painel exibe
select website_url as diagnostico from brands where name = 'Akea';
