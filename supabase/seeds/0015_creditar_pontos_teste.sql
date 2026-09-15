-- =====================================================================
-- Crédito de pontos para testar o desconto no checkout
-- =====================================================================
-- Rodar no SQL Editor com o editor vazio e NADA selecionado.
--
-- POR QUE PELO SQL: `impact_points` não é gravável pelo cliente desde o
-- 0002_rls_hardening — há um `revoke update on profiles` e um `grant
-- update (full_name, city, avatar_url)`. Fora daqui, pontos só entram
-- pelo gatilho handle_donation_completed, quando uma doação é concluída.
--
-- 500 pontos = R$ 50 de desconto (10 pontos = R$ 1). Com uma peça de
-- R$ 175 no carrinho, o desconto aparece e sobra saldo — assim dá para
-- ver o débito parcial, que é o caso interessante.
--
-- Escreve nos dois lugares de propósito: o saldo em `profiles` e o
-- lançamento em `points_transactions`. É o que a tela de Pontos de
-- Impacto lista, e deixar os dois em desacordo criaria um extrato que
-- não explica o saldo.
--
-- PARA DESFAZER depois do teste, com o saldo de volta a zero:
--   update profiles set impact_points = 0
--    where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6';
--   delete from points_transactions
--    where user_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
--      and reason = 'Crédito de teste';
-- =====================================================================

with credito as (
  update profiles
  set impact_points = impact_points + 500
  where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
  returning id, impact_points
),
lancamento as (
  insert into points_transactions (user_id, amount, reason)
  select id, 500, 'Crédito de teste' from credito
  returning user_id
)
select (select impact_points from credito)            as saldo_agora,
       (select count(*) from lancamento)              as lancamentos_criados,
       (select impact_points from credito) / 10 || ' reais de desconto disponível' as equivale_a;
