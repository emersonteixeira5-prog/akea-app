-- =====================================================================
-- Modo marca temporário — para subir a logo da Akea pelo próprio app
-- =====================================================================
-- Rodar no SQL Editor, com NADA selecionado no editor.
--
-- POR QUE ISTO EXISTE: o upload pelo painel do Storage falhou três vezes
-- seguidas (akea.jpg e as 11 logos otimizadas). O app tem upload de logo
-- embutido, com mensagem de erro visível — é o caminho que ainda não
-- tentamos, e é o único que mostra POR QUE falha.
--
-- POR QUE NÃO BASTA TROCAR O account_type: todas as telas de marca fazem
--   .from('brands').eq('owner_id', <você>).maybeSingle()
-- e o maybeSingle() dá erro com mais de uma linha. As 12 marcas do
-- 0001_recria_marcas.sql estão todas sob a sua conta. Sem a Parte 1
-- abaixo, toda tela de marca abriria vazia e a tela de completar perfil
-- criaria uma 14ª marca chamada "Minha marca".
--
-- REVERSÃO: supabase/seeds/0010_reverter_modo_marca.sql desfaz tudo.
-- Rode assim que a logo subir.
-- =====================================================================

do $$
declare
  v_voce  uuid := 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6';
  v_abrigo uuid;
begin
  if not exists (select 1 from profiles where id = v_voce) then
    raise exception 'Perfil % não existe', v_voce;
  end if;

  -- -------------------------------------------------------------------
  -- PARTE 1 — estacionar as outras marcas noutro dono
  -- -------------------------------------------------------------------
  -- brands.owner_id é NOT NULL, então não dá para simplesmente esvaziar.
  -- Vão para o dono da Sena, o único outro perfil que existe. Isso não
  -- muda nada do que você vê como usuário: a vitrine lê brands com a
  -- policy `brands_select_all using (true)`, e os produtos são ligados
  -- por brand_id, não por dono.
  --
  -- Efeito colateral enquanto durar: a conta da Sena passa a ter 13
  -- marcas, então ELA fica com o mesmo problema de maybeSingle. Não
  -- entre no app por ela até rodar a reversão.
  select id into v_abrigo from profiles where id <> v_voce limit 1;
  if v_abrigo is null then
    raise exception 'Não há outro perfil para estacionar as marcas. Pare aqui.';
  end if;

  update brands
  set owner_id = v_abrigo
  where owner_id = v_voce and name <> 'Akea';

  -- -------------------------------------------------------------------
  -- PARTE 2 — endereço de coleta provisório para a Akea
  -- -------------------------------------------------------------------
  -- Sem pickup_address o RootNavigator te prende na tela de completar
  -- perfil (RootNavigator.tsx:79), que ao salvar apagaria a bio e o
  -- instagram da Akea — o formulário abre em branco. Com endereço, você
  -- cai direto nas abas de marca e vai em Perfil, que já vem preenchido.
  --
  -- Só preenche se estiver nulo. Corrija o texto na própria tela de
  -- Perfil depois, ou deixe que a reversão devolve para null.
  update brands
  set pickup_address = '(provisório — definir endereço de coleta)'
  where name = 'Akea' and pickup_address is null;

  -- -------------------------------------------------------------------
  -- PARTE 3 — sua conta vira tipo marca
  -- -------------------------------------------------------------------
  -- account_type não é gravável pelo cliente desde o 0002_rls_hardening
  -- (revoke update ... grant update (full_name, city, avatar_url)).
  -- Só aqui, no SQL Editor, que roda como superusuário.
  update profiles set account_type = 'brand' where id = v_voce;
end $$;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select (select account_type from profiles
         where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6')          as seu_tipo,
       (select count(*) from brands
         where owner_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6')    as marcas_suas,
       (select string_agg(name, ', ') from brands
         where owner_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6')    as quais,
       (select coalesce(pickup_address, 'SEM ENDERECO') from brands
         where name = 'Akea')                                        as coleta_akea,
       case when (select count(*) from brands
                   where owner_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6') = 1
            then 'PODE ENTRAR NO APP'
            else 'NAO ENTRE - ainda ha ambiguidade' end               as situacao;
