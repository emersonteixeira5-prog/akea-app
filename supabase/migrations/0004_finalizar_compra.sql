-- =====================================================================
-- PARTE 1 de 2 — a função de checkout
-- =====================================================================
-- Rodar no SQL Editor com o editor vazio e NADA selecionado.
-- Depois rodar a PARTE 2 (0005_finalizar_compra_permissoes.sql), que
-- concede a permissão e confere. Sem a parte 2 o app recebe
-- "permission denied for function finalizar_compra".
--
-- Substitui os três inserts que a tela fazia em sequência. Numa transação
-- só: erro em qualquer ponto desfaz tudo, inclusive pedidos de outras
-- marcas do mesmo carrinho. E o preço passa a vir de `products`, não do
-- cliente.
--
-- O comentário completo do desenho está em
-- supabase/migrations/NOTAS_0004_checkout.md
-- =====================================================================

create or replace function public.finalizar_compra(
  p_product_ids     uuid[],
  p_delivery_method text,
  p_use_points      boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_frete constant integer := 1500;   -- espelha SHIPPING_CENTS da tela
  v_user      uuid := auth.uid();
  v_ids       uuid[];
  v_id        uuid;
  v_status    text;
  v_nome      text;
  v_subtotal  integer := 0;
  v_frete     integer := 0;
  v_desconto  integer := 0;
  v_pontos    integer := 0;
  v_saldo     integer;
  v_n_marcas  integer;
  v_i         integer := 0;
  v_marca     uuid;
  v_sub_marca   integer;
  v_desc_marca  integer;
  v_frete_marca integer;
  v_desc_usado  integer := 0;
  v_frete_usado integer := 0;
  v_pedido    uuid;
  v_pedidos   jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Sessão expirada. Entre novamente para concluir o pedido.' using errcode = '42501';
  end if;

  if p_delivery_method not in ('pickup', 'shipping') then
    raise exception 'Forma de entrega inválida.' using errcode = '22023';
  end if;

  -- Ordem crescente de id: ordem global de travamento, para dois checkouts
  -- simultâneos com as mesmas peças não travarem um ao outro.
  select array_agg(distinct t.id order by t.id) into v_ids
  from unnest(p_product_ids) as t(id);

  if v_ids is null or array_length(v_ids, 1) = 0 then
    raise exception 'Carrinho vazio.' using errcode = '22023';
  end if;

  -- 1. Travar e conferir cada peça, antes de qualquer escrita.
  foreach v_id in array v_ids loop
    select status, name into v_status, v_nome from products where id = v_id for update;

    if v_status is null then
      raise exception 'Uma das peças não está mais no catálogo. Remova-a do carrinho.' using errcode = 'P0002';
    end if;

    if v_status <> 'active' then
      raise exception '"%" já foi vendida. Como cada peça é única, não há outra igual — remova-a do carrinho.', v_nome
        using errcode = 'P0001';
    end if;
  end loop;

  -- 2. Valores calculados aqui, nunca recebidos do cliente.
  select coalesce(sum(price_cents), 0) into v_subtotal from products where id = any(v_ids);

  if v_subtotal <= 0 then
    raise exception 'Não foi possível calcular o valor do pedido.' using errcode = '22023';
  end if;

  v_frete := case when p_delivery_method = 'shipping' then c_frete else 0 end;

  if p_delivery_method = 'shipping'
     and not exists (select 1 from addresses where user_id = v_user and is_default = true) then
    raise exception 'Cadastre um endereço de entrega antes de concluir o pedido.' using errcode = '22023';
  end if;

  if p_use_points then
    select impact_points into v_saldo from profiles where id = v_user for update;
    -- 10 pontos = R$ 1. Ida e volta por pontos inteiros evita fração.
    v_pontos   := least(coalesce(v_saldo, 0), v_subtotal / 10);
    v_desconto := v_pontos * 10;
  end if;

  -- 3. Um pedido por marca. A última leva a sobra do rateio, para a soma
  --    dos pedidos bater exatamente com o total.
  select count(distinct brand_id) into v_n_marcas from products where id = any(v_ids);

  for v_marca, v_sub_marca in
    select brand_id, sum(price_cents) from products where id = any(v_ids) group by brand_id order by brand_id
  loop
    v_i := v_i + 1;

    if v_i = v_n_marcas then
      v_desc_marca  := v_desconto - v_desc_usado;
      v_frete_marca := v_frete - v_frete_usado;
    else
      v_desc_marca  := (v_desconto * v_sub_marca) / v_subtotal;
      v_frete_marca := (v_frete * v_sub_marca) / v_subtotal;
    end if;

    v_desc_usado  := v_desc_usado + v_desc_marca;
    v_frete_usado := v_frete_usado + v_frete_marca;

    insert into orders (user_id, brand_id, total_cents, shipping_cents, delivery_method, status)
    values (v_user, v_marca, v_sub_marca - v_desc_marca + v_frete_marca,
            v_frete_marca, p_delivery_method, 'paid')
    returning id into v_pedido;

    insert into order_items (order_id, product_id, price_cents)
    select v_pedido, p.id, p.price_cents
    from products p where p.id = any(v_ids) and p.brand_id = v_marca;

    v_pedidos := v_pedidos || jsonb_build_object(
      'pedido_id', v_pedido, 'marca_id', v_marca,
      'total_cents', v_sub_marca - v_desc_marca + v_frete_marca);
  end loop;

  -- 4. Pontos, pela função que já existe. Mesma transação: erro aqui
  --    desfaz os pedidos criados acima.
  if v_pontos > 0 then
    perform redeem_impact_points(v_pontos, 'Desconto em compra');
  end if;

  return jsonb_build_object(
    'pedidos', v_pedidos,
    'subtotal_cents', v_subtotal,
    'desconto_cents', v_desconto,
    'frete_cents', v_frete,
    'total_cents', v_subtotal - v_desconto + v_frete,
    'pontos_usados', v_pontos);
end;
$$;

-- Conferência da parte 1. Esperado: uma linha.
select proname as criada, pg_get_function_identity_arguments(oid) as argumentos
from pg_proc
where proname = 'finalizar_compra'
  and pronamespace = 'public'::regnamespace;
