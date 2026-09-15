-- =====================================================================
-- Desfaz o modo marca — UM COMANDO SÓ
-- =====================================================================
-- Reverte o 0021_modo_marca_akea_v3.sql. Mesmo formato dele: tudo num
-- comando, porque as versões em bloco do $$ ... end $$ falharam calado
-- quatro vezes nesta sessão.
--
-- Esperado:
--   marcas_devolvidas = 11
--   endereco_limpo    = 1
--   seu_tipo          = user
--
-- NÃO mexe em logo_url: se a logo da Akea tiver subido pelo app, fica.
-- Não apaga marca nenhuma: a fantasma já foi removida pelo 0013.
-- =====================================================================

with devolvidas as (
  -- As 11 estacionadas voltam, identificadas pelos ids fixos do
  -- 0001_recria_marcas.sql — independente de sob qual perfil pararam.
  -- A Akea (a1000001) não está na lista: nunca saiu.
  update brands
  set owner_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
  where id in (
    'a1000002-0000-4000-8000-000000000002',  -- Towa Dolls
    'a1000003-0000-4000-8000-000000000003',  -- Angela Morales
    'a1000004-0000-4000-8000-000000000004',  -- ByG Bolsos y Accesorios
    'a1000005-0000-4000-8000-000000000005',  -- AK Fashion
    'a1000006-0000-4000-8000-000000000006',  -- VL Diseños Innovadores
    'a1000007-0000-4000-8000-000000000007',  -- Yasmin
    'a1000008-0000-4000-8000-000000000008',  -- JJ Confecciones
    'a1000009-0000-4000-8000-000000000009',  -- Rivieras Confección
    'a1000010-0000-4000-8000-000000000010',  -- Diseños Amalia
    'a1000011-0000-4000-8000-000000000011',  -- Confecciones Erica
    'a1000012-0000-4000-8000-000000000012'   -- Mistura
  )
  returning id
),
endereco as (
  -- Só o texto provisório sai. Endereço de verdade que você tenha escrito
  -- na tela de Perfil fica.
  update brands
  set pickup_address = null
  where name = 'Akea'
    and pickup_address = '(provisório — definir endereço de coleta)'
  returning id
),
tipo as (
  update profiles
  set account_type = 'user'
  where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6'
  returning account_type
)
select (select count(*) from devolvidas) as marcas_devolvidas,
       (select count(*) from endereco)   as endereco_limpo,
       (select account_type from tipo)   as seu_tipo;
