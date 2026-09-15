-- =====================================================================
-- Modo marca — UM COMANDO SÓ
-- =====================================================================
-- As versões anteriores usavam do $$ ... end $$ seguido de um select, e
-- não aplicaram em três tentativas. Aqui tudo acontece num comando: ou
-- executa inteiro, ou dá erro de sintaxe. Não há meio-termo silencioso.
--
-- O resultado mostra o que foi feito. Esperado:
--   marcas_estacionadas = 11
--   endereco_provisorio = 1
--   seu_tipo            = brand
--
-- Desfaz com 0020_reverter_modo_marca_v2.sql.
-- =====================================================================

with abrigo as (
  -- order by explícito: antes era `limit 1` solto, e com três perfis no
  -- banco o Postgres podia devolver qualquer um.
  select id from profiles
  where id <> 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
  order by id
  limit 1
),
estacionadas as (
  update brands
  set owner_id = (select id from abrigo)
  where owner_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
    and name <> 'Akea'
  returning id
),
endereco as (
  -- Sem ponto de coleta o app prende na tela de completar perfil, que ao
  -- salvar apagaria a bio e o instagram da Akea. O 0020 limpa depois.
  update brands
  set pickup_address = '(provisório — definir endereço de coleta)'
  where name = 'Akea' and pickup_address is null
  returning id
),
tipo as (
  update profiles
  set account_type = 'brand'
  where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
  returning account_type
)
select (select count(*) from estacionadas)  as marcas_estacionadas,
       (select count(*) from endereco)      as endereco_provisorio,
       (select account_type from tipo)      as seu_tipo,
       (select full_name from profiles
         where id = (select id from abrigo)) as estacionadas_sob;
