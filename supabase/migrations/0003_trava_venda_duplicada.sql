-- =====================================================================
-- Trava de venda duplicada
-- =====================================================================
-- Rodar no SQL Editor, com NADA selecionado no editor.
--
-- O PROBLEMA: cada peça é única, e o gatilho on_order_item_inserted marca
-- o produto como `sold` DEPOIS que o item entra. Entre a tela do carrinho
-- conferir a disponibilidade e o pedido ser gravado existe uma janela em
-- que duas pessoas podem comprar a mesma peça. A conferência na tela
-- (CarrinhoScreen) fecha o caso comum — carrinho velho, peça já vendida —
-- mas não fecha a corrida entre dois checkouts simultâneos. Isso só o
-- banco resolve.
--
-- COMO: um gatilho BEFORE INSERT que trava a linha do produto com
-- SELECT ... FOR UPDATE antes de deixar o item entrar. Se duas transações
-- tentarem a mesma peça, a segunda espera a primeira terminar e então
-- relê o status já atualizado — em READ COMMITTED, o FOR UPDATE relê a
-- versão recém-confirmada depois de obter a trava. A segunda recebe erro,
-- não um pedido fantasma.
--
-- POR QUE NÃO UMA RESTRIÇÃO DE UNICIDADE em order_items(product_id), que
-- seria mais simples: ela queimaria a peça para sempre. A tabela orders
-- prevê status 'cancelled', e com o índice único um pedido cancelado
-- deixaria o produto impossível de vender de novo. O gatilho respeita o
-- campo `status`, então um fluxo futuro de cancelamento só precisa
-- devolver o produto para 'active'.
--
-- A MENSAGEM É PARA O COMPRADOR: ela sobe crua até o alerta da tela de
-- checkout (CheckoutScreen.tsx:149 mostra err.message). Por isso nomeia a
-- peça e diz o que fazer, em vez de falar de restrição de integridade.
-- =====================================================================

create or replace function public.guard_order_item_disponivel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_nome   text;
begin
  -- FOR UPDATE é o ponto inteiro desta função: serializa duas compras
  -- simultâneas da mesma peça. SECURITY DEFINER porque quem compra não é
  -- dono do produto — sob RLS, travar a linha exigiria a política de
  -- update da marca, e o comprador seria barrado.
  select status, name into v_status, v_nome
  from products
  where id = new.product_id
  for update;

  if v_status is null then
    raise exception 'Esta peça não está mais no catálogo. Remova-a do carrinho para concluir o pedido.'
      using errcode = 'P0002';
  end if;

  if v_status <> 'active' then
    raise exception '"%" já foi vendida. Como cada peça é única, não há outra igual — remova-a do carrinho para concluir o pedido.', v_nome
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Só INSERT: não existe caminho no app que troque o product_id de um item
-- já gravado, e order_items não tem tela de edição.
drop trigger if exists on_order_item_guard on order_items;
create trigger on_order_item_guard
  before insert on order_items
  for each row
  execute function public.guard_order_item_disponivel();

revoke all on function public.guard_order_item_disponivel() from public, anon;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
-- Esperado: duas linhas, o guard BEFORE e o on_order_item_inserted AFTER,
-- nesta ordem. A ordem importa: o BEFORE precisa recusar antes de o AFTER
-- marcar como vendido.
select t.tgname                                              as gatilho,
       case t.tgtype::integer & 2 when 2 then 'BEFORE' else 'AFTER' end as momento,
       p.proname                                             as funcao,
       case when t.tgenabled = 'O' then 'ativo' else 'DESATIVADO' end   as situacao
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.order_items'::regclass
  and not t.tgisinternal
order by momento desc, t.tgname;
