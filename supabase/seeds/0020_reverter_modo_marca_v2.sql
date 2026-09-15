-- =====================================================================
-- Reversão do modo marca — desfaz o 0009
-- =====================================================================
-- Rodar assim que a logo da Akea tiver subido pelo app (ou se a
-- tentativa não der certo e você quiser voltar ao estado anterior).
--
-- NÃO mexe em logo_url: o que o app gravou fica.
-- =====================================================================

do $$
declare
  v_voce uuid := 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6';
begin
  -- As 11 marcas estacionadas voltam para você. Identificadas pelos ids
  -- fixos do 0001_recria_marcas.sql — a Sena, que tem id próprio e nunca
  -- foi sua, fica onde sempre esteve.
  update brands
  set owner_id = v_voce
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
  );

  -- Marca fantasma criada pelo CompletarPerfilMarcaScreen em 14/09/2026
  -- 07:42 UTC, quando o app entrou em modo marca antes de as 12 marcas
  -- terem sido desambiguadas: o maybeSingle falhou, o código caiu no ramo
  -- de insert (CompletarPerfilMarcaScreen.tsx:74) e criou uma marca com o
  -- nome do perfil. Ela aparece na vitrine pública.
  -- Zero produtos, zero doações, zero pedidos — conferido por REST.
  delete from brands where id = 'ac047884-a35e-48ee-8209-5cb899ee5eae';

  -- Endereço provisório sai, se você não tiver escrito um de verdade.
  update brands
  set pickup_address = null
  where name = 'Akea' and pickup_address = '(provisório — definir endereço de coleta)';

  -- Volta a 'user', que é como a vitrine (UserRootStack) aparece. Se você
  -- preferir continuar entrando pelo painel de marca, apague esta linha —
  -- mas aí a Akea tem que seguir sendo a sua única marca, senão o
  -- maybeSingle volta a falhar e o app cria outra marca fantasma.
  update profiles set account_type = 'user' where id = v_voce;
end $$;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select (select account_type from profiles where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6') as seu_tipo,
       (select count(*) from brands where owner_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6') as marcas_suas,
       (select case when logo_url is null then '--- SEM LOGO ---'
                    else regexp_replace(logo_url, '^.*/', '') end
          from brands where name = 'Akea') as logo_akea;
