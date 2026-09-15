-- =====================================================================
-- 0002 — profiles.avatar_url + endurecimento de RLS
-- =====================================================================
-- Rodar no painel do Supabase → SQL Editor → New query → Run.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- ATENÇÃO: o editor roda só o TEXTO SELECIONADO quando há algo destacado.
-- Clique no editor e desmarque tudo antes de rodar, ou rode parte por
-- parte usando os blocos abaixo. Cada parte termina com um select que
-- mostra o que ela fez — se o resultado não aparecer, aquela parte falhou.
-- =====================================================================


-- =====================================================================
-- PARTE 1 — coluna avatar_url
-- =====================================================================
-- O app grava profiles.avatar_url em CompletarPerfilUsuarioScreen e
-- PerfilScreen, mas a coluna nunca existiu. O update inteiro era rejeitado
-- com 42703, derrubando junto o campo `city` que vai no mesmo payload.

alter table public.profiles add column if not exists avatar_url text;

select 'parte 1' as parte,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'profiles'
                           and column_name = 'avatar_url')
            then 'ok — avatar_url existe' else 'FALHOU' end as resultado;


-- =====================================================================
-- PARTE 2 — WITH CHECK explícito nas políticas de UPDATE
-- =====================================================================
-- Sem WITH CHECK o Postgres reaproveita a expressão do USING para validar
-- a linha nova, então isto NÃO muda o comportamento — deixa a intenção
-- escrita, para que ninguém "simplifique" o USING depois achando que a
-- linha nova está livre.

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "brands_update_own" on brands;
create policy "brands_update_own" on brands
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "donations_update_own_brand" on donations;
create policy "donations_update_own_brand" on donations
  for update
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));

drop policy if exists "orders_update_own_brand" on orders;
create policy "orders_update_own_brand" on orders
  for update
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));

drop policy if exists "products_all_own_brand" on products;
create policy "products_all_own_brand" on products
  for all
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));

select 'parte 2' as parte,
       count(*) || ' de 5 políticas com with check' as resultado
from pg_policies
where schemaname = 'public' and with_check is not null
  and policyname in ('profiles_update_own', 'brands_update_own', 'products_all_own_brand',
                     'donations_update_own_brand', 'orders_update_own_brand');


-- =====================================================================
-- PARTE 3 — privilégio de coluna (o que de fato fecha o buraco)
-- =====================================================================
-- RLS decide QUAIS LINHAS podem ser alteradas. Não decide QUAIS COLUNAS.
-- Com `grant update` na tabela inteira, o dono da linha podia gravar
-- `impact_points = 999999` (que vira desconto no checkout) ou virar
-- `account_type = 'brand'` sozinho.

revoke update on public.profiles from authenticated, anon;
grant update (full_name, city, avatar_url) on public.profiles to authenticated;

revoke update on public.brands from authenticated, anon;
grant update (
  name, bio, instagram, instagram_url, website_url,
  cnpj_cpf, pickup_address, logo_url, video_url, categories
) on public.brands to authenticated;

select 'parte 3 — ' || table_name as parte,
       string_agg(column_name, ', ' order by column_name) as resultado
from information_schema.column_privileges
where table_schema = 'public' and table_name in ('profiles', 'brands')
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
group by table_name;


-- =====================================================================
-- PARTE 4 — resgate de pontos via função
-- =====================================================================
-- O checkout precisava baixar impact_points, e era esse caso de uso que
-- obrigava a manter o grant aberto. Aqui o débito e o extrato viram uma
-- operação só, atômica, com o saldo conferido no servidor. SECURITY
-- DEFINER roda como dono da função, então passa por cima do RLS e do
-- grant de coluna — de propósito, é o único caminho autorizado.

create or replace function public.redeem_impact_points(
  p_amount integer,
  p_reason text default 'Desconto em compra'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Quantidade de pontos inválida' using errcode = '22023';
  end if;

  -- FOR UPDATE trava a linha até o commit: dois checkouts simultâneos não
  -- conseguem ler o mesmo saldo e gastar o dobro.
  select impact_points into v_balance
  from profiles where id = v_user for update;

  if v_balance is null then
    raise exception 'Perfil não encontrado' using errcode = 'P0002';
  end if;

  if v_balance < p_amount then
    raise exception 'Saldo de pontos insuficiente' using errcode = 'P0001';
  end if;

  update profiles set impact_points = v_balance - p_amount where id = v_user;
  insert into points_transactions (user_id, amount, reason)
  values (v_user, -p_amount, p_reason);

  return v_balance - p_amount;
end;
$$;

revoke all on function public.redeem_impact_points(integer, text) from public, anon;
grant execute on function public.redeem_impact_points(integer, text) to authenticated;

-- O insert direto no extrato não é mais necessário: o único débito
-- legítimo passa pela função acima, que já grava a transação.
drop policy if exists "points_insert_own_negative" on points_transactions;

select 'parte 4' as parte,
       coalesce((select 'ok — ' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')'
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'redeem_impact_points'),
                'FALHOU') as resultado;
