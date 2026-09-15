-- =====================================================================
-- photo_url dos produtos — imagens do Unsplash
-- =====================================================================
-- Rodar no SQL Editor, com nada selecionado no editor.
--
-- COMO AS FOTOS FORAM ESCOLHIDAS: busquei no Unsplash por categoria
-- (bolsa, boneca, camisa de linho, vestido floral, jaqueta jeans, blazer,
-- roupa esportiva, tricô), montei uma folha de contato com as 64
-- candidatas e olhei todas antes de atribuir. Duas da busca por "rag
-- doll" eram gatos de verdade e foram descartadas — teriam ido parar na
-- Towa Dolls.
--
-- SÃO FOTOS DE BANCO, NÃO DAS PEÇAS REAIS. Combinam com o tipo de produto
-- (bolsa na bolsa, legging na legging), mas nenhuma retrata a peça que a
-- descrição promete. Para um catálogo de verdade, precisam ser
-- substituídas por fotos das peças — o que a tela de catálogo da marca já
-- faz, subindo para o bucket product-photos.
--
-- SÃO LINKS EXTERNOS para images.unsplash.com. Não consomem seu Storage,
-- mas dependem do Unsplash continuar servindo. É o mesmo esquema do
-- "Abrigo Largo Retazos", que já era assim.
--
-- ALGUMAS SE REPETEM entre marcas: as categorias renderam menos imagens
-- aproveitáveis do que os 42 produtos. Preferi repetir a colocar foto que
-- não corresponde ao produto.
--
-- FICA SEM FOTO: "Colar de Retalhos Trançado" (Akea). Não consegui
-- coletar a categoria de bijuteria antes de o Unsplash bloquear meu
-- acesso, e não vou pôr foto de bolsa num colar.
-- =====================================================================

do $$
declare
  v_base text := 'https://images.unsplash.com/';
  v_sufixo text := '?w=800&h=800&fit=crop';
  v_marca text; v_produto text; v_foto text;
  v_pares text[][] := array[
    -- Akea
    ['Akea','Bolsa Tote de Lona Reaproveitada','photo-1574365569389-a10d488ca3fb'],
    ['Akea','Jaqueta Jeans Remendada','photo-1611312449408-fcece27cdbb7'],

    -- Towa Dolls
    ['Towa Dolls','Boneca de Pano Gata Preta','photo-1652379546952-a5e71b6c8e3f'],
    ['Towa Dolls','Boneca de Retalhos Costurada à Mão','photo-1778674766606-6e82b7d16f08'],
    ['Towa Dolls','Kit Boneca e Roupinhas','photo-1760297999493-8459a62f940e'],

    -- Angela Morales
    ['Angela Morales','Vestido Midi de Algodão Reaproveitado','photo-1542295669297-4d352b042bca'],
    ['Angela Morales','Blusa Bordada à Mão','photo-1693443688057-85f57b872a3c'],
    ['Angela Morales','Saia Plissada de Tecido Doado','photo-1762154057377-cc9d3dd6900c'],

    -- ByG Bolsos y Accesorios
    ['ByG Bolsos y Accesorios','Bolsa Transversal de Couro Reciclado','photo-1544816155-12df9643f363'],
    ['ByG Bolsos y Accesorios','Carteira de Retalhos Bordada','photo-1663573690125-d326a87a2535'],
    ['ByG Bolsos y Accesorios','Necessaire com Estampa de Colibri','photo-1632942480766-9cee148c4ee8'],

    -- AK Fashion
    ['AK Fashion','Camisa Oversized de Linho','photo-1740711152088-88a009e877bb'],
    ['AK Fashion','Calça Wide Leg de Brim','photo-1608147152875-b0eb0c53d491'],
    ['AK Fashion','Colete de Alfaiataria Reconstruído','photo-1618886614638-80e3c103d31a'],

    -- VL Diseños Innovadores
    ['VL Diseños Innovadores','Moletom Patchwork Geométrico','photo-1631541909061-71e349d1f203'],
    ['VL Diseños Innovadores','Camiseta Estampa Raposa','photo-1713881587420-113c1c43e28a'],
    ['VL Diseños Innovadores','Jaqueta Bomber de Retalhos','photo-1537465978529-d23b17165b3b'],

    -- Yasmin
    ['Yasmin','Vestido Floral de Tecido Resgatado','photo-1715852700550-6436320162e6'],
    ['Yasmin','Blusa de Manga Bufante','photo-1602010069450-0a62034f235c'],
    ['Yasmin','Saia Longa Estampada','photo-1496747611176-843222e1e57c'],

    -- JJ Confecciones
    ['JJ Confecciones','Camisa Social Reformada','photo-1740711152088-88a009e877bb'],
    ['JJ Confecciones','Calça Chino de Algodão','photo-1617137968427-85924c800a22'],
    ['JJ Confecciones','Blazer Estruturado Upcycling','photo-1617137984095-74e4e5e3613f'],

    -- Rivieras Confección
    ['Rivieras Confección','Vestido de Festa Reaproveitado','photo-1511130558090-00af810c21b1'],
    ['Rivieras Confección','Camisa de Seda Restaurada','photo-1713881676551-b16f22ce4719'],
    ['Rivieras Confección','Conjunto de Alfaiataria Azul-Marinho','photo-1603394151492-5e9b974b090b'],

    -- Diseños Amalia
    ['Diseños Amalia','Blusa Lilás de Viscose','photo-1713881842156-3d9ef36418cc'],
    ['Diseños Amalia','Cardigã de Tricô Remendado','photo-1683315565563-f72590773805'],
    ['Diseños Amalia','Vestido Curto Aquarela','photo-1517970640957-23d07d5ed08c'],

    -- Confecciones Erica
    ['Confecciones Erica','Legging Esportiva de Malha Reciclada','photo-1584863495140-a320b13a11a8'],
    ['Confecciones Erica','Top Esportivo Costurado à Mão','photo-1606902965551-dce093cda6e7'],
    ['Confecciones Erica','Corta-Vento de Tecido Reaproveitado','photo-1645207803533-e2cfe1382f2c'],

    -- Mistura
    ['Mistura','Kimono de Retalhos Estampados','photo-1602010069450-0a62034f235c'],
    ['Mistura','Camiseta Tie-Dye Reaproveitada','photo-1693443688057-85f57b872a3c'],
    ['Mistura','Macacão de Brim Reconstruído','photo-1495105787522-5334e3ffa0ef'],

    -- Sena
    ['Sena','Chaqueta de Retalhos sob Medida','photo-1611312449408-fcece27cdbb7'],
    ['Sena','Saia de Retalhos Corte A','photo-1762154057377-cc9d3dd6900c'],
    ['Sena','Colete de Retalhos Reversível','photo-1593032465175-481ac7f401a0'],
    ['Sena','Bolsa Artesanal de Firma','photo-1544816155-12df9643f363'],
    ['Sena','Jaqueta patchwork','photo-1537465978529-d23b17165b3b']
  ];
  i int;
begin
  for i in 1 .. array_length(v_pares, 1) loop
    v_marca   := v_pares[i][1];
    v_produto := v_pares[i][2];
    v_foto    := v_pares[i][3];

    update products p
    set photo_url = v_base || v_foto || v_sufixo
    from brands b
    where p.brand_id = b.id and b.name = v_marca and p.name = v_produto;

    if not found then
      raise notice 'Produto não encontrado: % / %', v_marca, v_produto;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select b.name as marca,
       count(*) as produtos,
       count(*) filter (where p.photo_url is null) as sem_foto
from products p
join brands b on b.id = p.brand_id
group by b.name
order by sem_foto desc, b.name;
