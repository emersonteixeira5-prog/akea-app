-- =====================================================================
-- PARTE 2 de 2 — permissão e conferência do checkout
-- =====================================================================
-- Rodar DEPOIS do 0004_finalizar_compra.sql.
--
-- Se a parte 1 não tiver chegado inteira ao servidor, o primeiro comando
-- abaixo falha com "function public.finalizar_compra(...) does not exist".
-- Isso é proposital: é melhor um erro claro aqui do que descobrir pelo
-- app depois.
-- =====================================================================

revoke all on function public.finalizar_compra(uuid[], text, boolean) from public, anon;
grant execute on function public.finalizar_compra(uuid[], text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
-- Esperado: DUAS linhas, finalizar_compra e redeem_impact_points, ambas
-- com security_definer = true e com "authenticated=X" nas permissões.
select p.proname                                 as funcao,
       p.prosecdef                               as security_definer,
       array_to_string(p.proacl, '  ')           as permissoes
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('finalizar_compra', 'redeem_impact_points')
order by p.proname;
