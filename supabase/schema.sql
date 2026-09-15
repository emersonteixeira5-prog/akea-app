-- =====================================================================
-- AKEA Moda Circular — schema inicial do banco (Supabase / Postgres)
-- =====================================================================
-- Como rodar: painel do Supabase → SQL Editor → New query → cola tudo
-- isso aqui → Run. É seguro rodar uma vez só num projeto novo.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- PROFILES — um por usuário autenticado (tanto modo usuário quanto marca)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'user' check (account_type in ('user', 'brand')),
  full_name text not null default '',
  city text,
  avatar_url text,
  impact_points integer not null default 0 check (impact_points >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, account_type, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'account_type', 'user'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- BRANDS
-- ---------------------------------------------------------------------
create table brands (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  bio text,
  instagram text,
  instagram_url text,
  website_url text,
  cnpj_cpf text,
  pickup_address text,
  logo_url text,
  video_url text,
  categories text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS — sempre peça única (sem campo de estoque/quantidade)
-- ---------------------------------------------------------------------
create table products (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  status text not null default 'active' check (status in ('active', 'sold')),
  photo_url text,
  is_unique_piece boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- DONATIONS — o ciclo central do app
-- ---------------------------------------------------------------------
create table donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  material_types text[] not null default '{}',
  quantity_estimate text not null check (quantity_estimate in ('few_items', 'medium_bag', 'large_bag')),
  photo_url text,
  status text not null default 'registered'
    check (status in ('registered', 'received', 'evaluated', 'transforming', 'completed', 'rejected')),
  result_photo_url text,
  result_product_id uuid references products(id),
  points_awarded integer,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- POINTS_TRANSACTIONS — extrato de pontos de impacto
-- ---------------------------------------------------------------------
create table points_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  donation_id uuid references donations(id),
  order_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.handle_donation_completed()
returns trigger as $$
begin
  if new.status = 'completed'
     and (old.status is distinct from 'completed')
     and new.points_awarded is not null then

    insert into points_transactions (user_id, amount, reason, donation_id)
    values (
      new.user_id,
      new.points_awarded,
      'Doação — ' || coalesce((select name from brands where id = new.brand_id), 'marca parceira'),
      new.id
    );

    update profiles set impact_points = impact_points + new.points_awarded where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_donation_completed
  after update on donations
  for each row execute procedure public.handle_donation_completed();

-- ---------------------------------------------------------------------
-- ORDERS / ORDER_ITEMS — um pedido por marca
-- ---------------------------------------------------------------------
create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  total_cents integer not null,
  shipping_cents integer not null default 0,
  delivery_method text not null check (delivery_method in ('pickup', 'shipping')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'ready', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  price_cents integer not null
);

-- ---------------------------------------------------------------------
-- ORDER_STAGES — etapas de produção que a marca publica no pedido
-- ---------------------------------------------------------------------
create table order_stages (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  stage_name text not null,
  description text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ADDRESSES — endereços de entrega do usuário
-- ---------------------------------------------------------------------
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- BRAND_FOLLOWERS — marcas que o usuário segue
-- ---------------------------------------------------------------------
create table brand_followers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, brand_id)
);

-- ---------------------------------------------------------------------
-- BANNERS — carrossel da Home
-- ---------------------------------------------------------------------
create table banners (
  id uuid primary key default uuid_generate_v4(),
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table donations enable row level security;
alter table points_transactions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_stages enable row level security;
alter table addresses enable row level security;
alter table brand_followers enable row level security;
alter table banners enable row level security;

-- Nota sobre WITH CHECK: quando omitido numa política de update, o Postgres
-- reaproveita a expressão do USING para validar a linha nova. Está escrito
-- aqui de forma explícita só para deixar a intenção clara.

create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "brands_select_all" on brands for select using (true);
create policy "brands_insert_own" on brands for insert with check (auth.uid() = owner_id);
create policy "brands_update_own" on brands for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "products_select_all" on products for select using (true);
create policy "products_all_own_brand" on products for all using (
  brand_id in (select id from brands where owner_id = auth.uid())
) with check (
  brand_id in (select id from brands where owner_id = auth.uid())
);

create policy "donations_select_own_user" on donations for select using (auth.uid() = user_id);
create policy "donations_select_own_brand" on donations for select using (
  brand_id in (select id from brands where owner_id = auth.uid())
);
create policy "donations_insert_own" on donations for insert with check (auth.uid() = user_id);
create policy "donations_update_own_brand" on donations for update using (
  brand_id in (select id from brands where owner_id = auth.uid())
);

-- Não há policy de insert em points_transactions: todo crédito vem do
-- trigger de doação e todo débito vem de redeem_impact_points(), ambos
-- security definer. O cliente não escreve o extrato direto.
create policy "points_select_own" on points_transactions for select using (auth.uid() = user_id);

create policy "orders_select_own_user" on orders for select using (auth.uid() = user_id);
create policy "orders_select_own_brand" on orders for select using (
  brand_id in (select id from brands where owner_id = auth.uid())
);
create policy "orders_insert_own" on orders for insert with check (auth.uid() = user_id);
create policy "orders_update_own_brand" on orders for update using (
  brand_id in (select id from brands where owner_id = auth.uid())
);

create policy "order_items_select" on order_items for select using (
  order_id in (select id from orders where user_id = auth.uid())
  or order_id in (select id from orders where brand_id in (select id from brands where owner_id = auth.uid()))
);
create policy "order_items_insert_own" on order_items for insert with check (
  order_id in (select id from orders where user_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- PRIVILÉGIO DE COLUNA
-- ---------------------------------------------------------------------
-- RLS decide quais LINHAS podem ser alteradas, não quais COLUNAS. Sem isto
-- o próprio dono da linha grava impact_points (que vira desconto no
-- checkout) ou muda o próprio account_type.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, city, avatar_url) on public.profiles to authenticated;

revoke update on public.brands from authenticated, anon;
grant update (
  name, bio, instagram, instagram_url, website_url,
  cnpj_cpf, pickup_address, logo_url, video_url, categories
) on public.brands to authenticated;

-- ---------------------------------------------------------------------
-- RESGATE DE PONTOS — único caminho de débito do saldo
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- LACUNA CONHECIDA — políticas de order_stages, addresses,
-- brand_followers e banners
-- ---------------------------------------------------------------------
-- Estas quatro tabelas foram reconstruídas a partir do banco em produção
-- sondando o PostgREST com a chave anon: colunas por tentativa de select,
-- tipos por erro de cast no filtro. Isso revela nome, tipo e nulidade das
-- colunas — NÃO revela políticas de RLS, defaults, índices ou constraints.
--
-- Rodar este arquivo num projeto novo cria as tabelas com RLS ligado e
-- nenhuma política, o que nega tudo. Antes de usar em projeto novo,
-- escreva as políticas — ou extraia as reais com um dump de verdade:
--   supabase db dump --schema public -f supabase/schema.sql
-- (exige a senha do banco / access token; rode você mesmo.)
--
-- O que dá pra afirmar por observação: `banners` tem select liberado para
-- anônimo (a Home lê o carrossel sem sessão).

create or replace function public.handle_order_item_inserted()
returns trigger as $$
begin
  update products set status = 'sold' where id = new.product_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_item_inserted
  after insert on order_items
  for each row execute procedure public.handle_order_item_inserted();

-- =====================================================================
-- ÍNDICES
-- =====================================================================
create index idx_brands_owner_id on brands(owner_id);
create index idx_products_brand_id on products(brand_id);
create index idx_donations_user_id on donations(user_id);
create index idx_donations_brand_id on donations(brand_id);
create index idx_orders_user_id on orders(user_id);
create index idx_orders_brand_id on orders(brand_id);