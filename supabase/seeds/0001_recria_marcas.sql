-- =====================================================================
-- Recriação das marcas parceiras
-- =====================================================================
-- Rodar no SQL Editor do projeto etpsmssnwlacpjdqbndf, com NADA selecionado
-- no editor (senão o painel executa só o trecho destacado).
--
-- Contexto: em 14/09/2026 os usuários e6db5281 e 93bc44b2 foram removidos
-- do Authentication. O cascade profiles -> brands -> products apagou 8 das
-- 9 marcas e ~33 produtos. Só a Sena (dona df4e40b1) sobreviveu.
--
-- O QUE ESTE SCRIPT RESTAURA: nome e instagram, que eu li antes da perda.
-- O QUE ELE NÃO RESTAURA: bio, pickup_address e categories das marcas
--   antigas — esses campos eu nunca li, então estão como null ou como
--   palpite marcado. Os produtos também não voltam: nome, preço e foto de
--   cada um se perderam com a cascata.
--
-- DONO DAS MARCAS: todas vão para ab39900d (sua conta nova), porque é o
--   único perfil disponível além da Sena. Era assim antes também — as 7
--   primeiras pertenciam a um único perfil tipo 'user'. Para usar outro
--   dono, troque o valor de v_owner no bloco abaixo.
--
-- Idempotente: rodar de novo não duplica (on conflict do nothing por id).
-- =====================================================================

do $$
declare
  v_owner uuid := 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6';
begin
  if not exists (select 1 from profiles where id = v_owner) then
    raise exception 'Perfil dono % não existe — ajuste v_owner', v_owner;
  end if;

  insert into brands (id, owner_id, name, bio, instagram, categories) values
    ('a1000001-0000-4000-8000-000000000001', v_owner, 'Akea',
     'Moda', '@AKEA', array['Acessórios','Bolsas','Roupas']),

    ('a1000002-0000-4000-8000-000000000002', v_owner, 'Towa Dolls',
     null, null, array['Bonecas']),

    ('a1000003-0000-4000-8000-000000000003', v_owner, 'Angela Morales',
     null, null, array['Roupas']),

    ('a1000004-0000-4000-8000-000000000004', v_owner, 'ByG Bolsos y Accesorios',
     null, null, array['Bolsas','Acessórios']),

    ('a1000005-0000-4000-8000-000000000005', v_owner, 'AK Fashion',
     null, null, array['Roupas']),

    ('a1000006-0000-4000-8000-000000000006', v_owner, 'VL Diseños Innovadores',
     null, null, array['Roupas']),

    ('a1000007-0000-4000-8000-000000000007', v_owner, 'Yasmin',
     null, null, array['Roupas']),

    -- Marcas novas: têm logo enviada, mas nunca existiram no banco.
    ('a1000008-0000-4000-8000-000000000008', v_owner, 'JJ Confecciones',
     null, null, array['Roupas']),

    ('a1000009-0000-4000-8000-000000000009', v_owner, 'Rivieras Confección',
     null, null, array['Roupas']),

    ('a1000010-0000-4000-8000-000000000010', v_owner, 'Diseños Amalia',
     null, null, array['Roupas']),

    ('a1000011-0000-4000-8000-000000000011', v_owner, 'Confecciones Erica',
     null, null, array['Roupas']),

    ('a1000012-0000-4000-8000-000000000012', v_owner, 'Mistura',
     null, null, array['Roupas'])
  on conflict (id) do nothing;
end $$;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select name,
       coalesce(instagram, '—')                as instagram,
       array_to_string(categories, ', ')       as categorias,
       case when logo_url is null then 'sem logo' else 'com logo' end as logo,
       case when pickup_address is null then 'SEM PONTO DE COLETA' else pickup_address end as coleta
from brands
order by name;
