-- =====================================================================
-- Desfaz as compras de teste e devolve o catálogo ao estado anterior
-- =====================================================================
-- Rodar DEPOIS de terminar os testes de checkout.
--
-- POR QUE PRECISA EXISTIR: o app não tem caminho para devolver um produto
-- vendido ao catálogo. O gatilho on_order_item_inserted marca como `sold`
-- e nada marca de volta. Cada compra de teste consome uma peça para
-- sempre, e como cada peça é única, não há reposição.
--
-- O QUE FAZ:
--   1. apaga os pedidos de teste (os itens saem junto, por cascade);
--   2. devolve as peças para `active`;
--   3. zera o saldo de pontos e apaga os lançamentos de teste.
--
-- O QUE NÃO TOCA: a "Jaqueta patchwork" da Sena, que já estava vendida
-- antes destes testes — ela veio de um pedido anterior e não é minha para
-- desfazer. Se quiser devolvê-la também, acrescente o nome na lista.
-- =====================================================================

do $$
declare
  v_voce uuid := 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6';
  v_pecas text[] := array[
    'Blusa Bordada à Mão',
    'Camisa Oversized de Linho'
    -- acrescente aqui a peça do teste com pontos, se tiver outro nome
  ];
begin
  -- 1. Pedidos que contenham essas peças, deste usuário. order_items tem
  --    "on delete cascade" para orders, então some junto.
  delete from orders o
  where o.user_id = v_voce
    and exists (
      select 1
      from order_items oi
      join products p on p.id = oi.product_id
      where oi.order_id = o.id
        and p.name = any(v_pecas)
    );

  -- 2. Peças de volta à vitrine.
  update products set status = 'active'
  where name = any(v_pecas) and status = 'sold';

  -- 3. Pontos: saldo de volta a zero (era esse antes do crédito de teste)
  --    e extrato limpo dos lançamentos que eu criei.
  update profiles set impact_points = 0 where id = v_voce;

  delete from points_transactions
  where user_id = v_voce
    and reason in ('Crédito de teste', 'Desconto em compra');
end $$;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select (select count(*) from products where status = 'active')            as ativos,
       (select count(*) from products where status = 'sold')              as vendidos,
       (select string_agg(name, ', ') from products where status = 'sold') as quais,
       (select impact_points from profiles
         where id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6')               as seus_pontos,
       (select count(*) from orders
         where user_id = 'ab39900d-8cb6-4dbf-829d-4a303a3cb3e6')          as seus_pedidos;
