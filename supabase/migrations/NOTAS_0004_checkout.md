# Por que o checkout foi para o banco

Notas de desenho da função `finalizar_compra`, tiradas de dentro do
arquivo SQL para encurtá-lo — a versão anterior tinha 190 linhas e não
chegou inteira ao servidor na primeira tentativa.

## O problema que resolve

A tela criava o pedido, depois os itens, depois resgatava os pontos: três
idas ao servidor, cada uma confirmando sozinha. Se a segunda falhasse — e
desde `0003_trava_venda_duplicada.sql` ela falha quando a peça já foi
vendida — sobrava um pedido órfão marcado como `paid` sem item nenhum.
Com várias marcas no carrinho era pior: os pedidos das marcas anteriores
já estavam gravados e não voltavam atrás.

Uma função roda numa transação só. Qualquer erro desfaz tudo.

## O buraco de preço que fecha junto

A tela enviava `price_cents` vindo do carrinho, e o banco acreditava. Dava
para fechar um pedido de R$ 0,01 alterando o que o app manda.

Agora o cliente diz apenas **quais** peças. Subtotal, desconto e frete são
calculados a partir de `products`. Nenhum valor em dinheiro atravessa a
rede na entrada.

## Detalhes que não são óbvios lendo o código

**Ordem de travamento.** As peças são travadas em ordem crescente de id.
Sem isso, dois checkouts com as mesmas duas peças em ordens opostas
travariam um ao outro indefinidamente.

**Rateio exato.** O desconto e o frete são divididos entre as marcas na
proporção do subtotal de cada uma. Divisão inteira perde centavos, então a
última marca leva a sobra e a soma dos pedidos fecha com o total. A versão
em JavaScript arredondava cada parcela e podia divergir um ou dois
centavos do que a tela mostrava.

**Conferência repetida.** A função confere disponibilidade e o gatilho do
`0003` confere de novo na inserção do item. É de propósito: na função a
mensagem sai antes de qualquer escrita, e a trava fica retida pelo resto
da transação. O gatilho continua valendo para qualquer outro caminho que
insira em `order_items`.

**`SECURITY DEFINER`.** Quem compra não é dono do produto. Sob RLS, travar
a linha com `FOR UPDATE` exigiria a política de update da marca, e o
comprador seria barrado antes de chegar à conferência.

**Pontos.** Reaproveita `redeem_impact_points` em vez de repetir a lógica.
Estando na mesma transação, um erro no débito desfaz os pedidos — o que
não acontecia quando eram duas chamadas separadas.

## O que continua faltando

`orders` não guarda o endereço de entrega. A função exige que exista um
endereço padrão antes de aceitar pedido com frete, mas **qual** endereço
não fica registrado. Se a pessoa trocar o endereço padrão depois, não há
como saber para onde aquele pedido foi. Resolver isso é uma coluna
`address_id` em `orders`, ou uma cópia do endereço no momento da compra —
que é o que lojas costumam fazer, justamente para o pedido não mudar
quando o cadastro muda.
