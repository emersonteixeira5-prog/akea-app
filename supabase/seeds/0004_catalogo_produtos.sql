-- =====================================================================
-- Catálogo de produtos para as marcas parceiras
-- =====================================================================
-- Rodar no SQL Editor, com nada selecionado no editor.
--
-- ORIGEM DOS DADOS: nomes, descrições e preços foram escritos por mim a
-- partir do ramo de cada marca. NÃO são os produtos perdidos na cascata
-- de 14/09 — aqueles nunca foram lidos e não têm como voltar.
--
-- FOTOS: photo_url fica nulo. O app trata isso (mostra um placeholder no
-- lugar da imagem), mas o catálogo vai parecer vazio até as fotos
-- entrarem. Elas podem ser enviadas depois pela tela de catálogo da
-- marca, que faz upload para o bucket product-photos.
--
-- PREÇOS: em centavos, faixa de R$ 69 a R$ 495, alinhada com o que já
-- existia (R$ 32,90 a R$ 529).
--
-- Idempotente: o `not exists` impede duplicar se você rodar de novo.
-- Marca que não existir é simplesmente ignorada (o join não casa).
-- =====================================================================

insert into products (brand_id, name, description, price_cents, status, is_unique_piece)
select b.id, v.produto, v.descricao, v.preco, 'active', true
from (values
  -- Akea — acessórios, bolsas e roupas
  ('Akea', 'Colar de Retalhos Trançado',          'Colar feito à mão com tiras de tecido doado, trançadas e finalizadas com fecho de metal reaproveitado.', 7900),
  ('Akea', 'Bolsa Tote de Lona Reaproveitada',    'Sacola estruturada em lona de banner publicitário, forrada com algodão cru.', 14900),
  ('Akea', 'Jaqueta Jeans Remendada',             'Jeans resgatado com remendos aplicados à mão na técnica sashiko.', 23900),

  -- Towa Dolls — bonecas
  ('Towa Dolls', 'Boneca de Pano Gata Preta',     'Boneca costurada à mão em algodão, com olhos de botão e enchimento de retalhos triturados.', 11900),
  ('Towa Dolls', 'Boneca de Retalhos Costurada à Mão', 'Cada boneca sai única: o corpo é montado com as sobras de tecido da semana.', 9800),
  ('Towa Dolls', 'Kit Boneca e Roupinhas',        'Boneca acompanhada de três mudas de roupa feitas com aparas de malha.', 16500),

  -- Angela Morales — arte e costura
  ('Angela Morales', 'Vestido Midi de Algodão Reaproveitado', 'Modelagem soltinha em algodão de lençóis resgatados, com bolsos embutidos.', 28900),
  ('Angela Morales', 'Blusa Bordada à Mão',       'Bordado floral aplicado sobre blusa de linho recuperada.', 17500),
  ('Angela Morales', 'Saia Plissada de Tecido Doado', 'Plissado feito a ferro em tecido de cortina doada, com cós elástico.', 19800),

  -- ByG Bolsos y Accesorios — bolsas e acessórios
  ('ByG Bolsos y Accesorios', 'Bolsa Transversal de Couro Reciclado', 'Couro de estofamento descartado, costurado à mão com alça regulável.', 25900),
  ('ByG Bolsos y Accesorios', 'Carteira de Retalhos Bordada', 'Carteira compacta com bordado de colibri, feita de sobras de tecido.', 8900),
  ('ByG Bolsos y Accesorios', 'Necessaire com Estampa de Colibri', 'Nécessaire impermeabilizada, forrada com tecido de guarda-chuva reaproveitado.', 6900),

  -- AK Fashion — roupas
  ('AK Fashion', 'Camisa Oversized de Linho',     'Linho recuperado de peças descartadas, com modelagem ampla e botões de madeira.', 21900),
  ('AK Fashion', 'Calça Wide Leg de Brim',        'Brim pesado de uniformes doados, reconstruído em modelagem pantalona.', 24500),
  ('AK Fashion', 'Colete de Alfaiataria Reconstruído', 'Colete montado a partir de dois ternos descartados, forro em cetim resgatado.', 19900),

  -- VL Diseños Innovadores — roupas
  ('VL Diseños Innovadores', 'Moletom Patchwork Geométrico', 'Moletom montado em blocos geométricos de malha, cada peça com combinação própria.', 22900),
  ('VL Diseños Innovadores', 'Camiseta Estampa Raposa', 'Estampa serigrafada à mão sobre camiseta de algodão recuperada.', 9500),
  ('VL Diseños Innovadores', 'Jaqueta Bomber de Retalhos', 'Bomber com corpo em retalhos e punhos de ribana reaproveitada.', 31500),

  -- Yasmin — roupas
  ('Yasmin', 'Vestido Floral de Tecido Resgatado', 'Estampa floral original dos anos 90, resgatada e remodelada em corte evasê.', 27500),
  ('Yasmin', 'Blusa de Manga Bufante',            'Manga bufante em voil recuperado, com acabamento em viés feito à mão.', 15900),
  ('Yasmin', 'Saia Longa Estampada',              'Saia de comprimento longo com dois tecidos doados combinados no corte.', 18500),

  -- JJ Confecciones — roupas
  ('JJ Confecciones', 'Camisa Social Reformada',  'Camisa social recuperada, com gola e punhos refeitos em tecido contrastante.', 16900),
  ('JJ Confecciones', 'Calça Chino de Algodão',   'Algodão resgatado de estoque parado, remodelado em corte reto.', 20500),
  ('JJ Confecciones', 'Blazer Estruturado Upcycling', 'Blazer reconstruído a partir de peças descartadas, com ombreiras refeitas.', 34900),

  -- Rivieras Confección — roupas
  ('Rivieras Confección', 'Vestido de Festa Reaproveitado', 'Vestido longo em cetim resgatado, com drapeado feito sob medida.', 42000),
  ('Rivieras Confección', 'Camisa de Seda Restaurada', 'Seda pura recuperada e restaurada ponto a ponto, com botões originais.', 26500),
  ('Rivieras Confección', 'Conjunto de Alfaiataria Azul-Marinho', 'Blazer e calça montados a partir de tecido de alfaiataria descartado.', 49500),

  -- Diseños Amalia — roupas
  ('Diseños Amalia', 'Blusa Lilás de Viscose',    'Viscose recuperada em tom lilás, com decote em V e caimento fluido.', 14500),
  ('Diseños Amalia', 'Cardigã de Tricô Remendado', 'Tricô doado, remendado à mão com linha contrastante na técnica visible mending.', 23500),
  ('Diseños Amalia', 'Vestido Curto Aquarela',    'Tingimento em aquarela aplicado sobre tecido branco resgatado.', 25500),

  -- Confecciones Erica — roupa esportiva
  ('Confecciones Erica', 'Legging Esportiva de Malha Reciclada', 'Malha de poliéster reciclado, com costura plana e cós alto.', 13900),
  ('Confecciones Erica', 'Top Esportivo Costurado à Mão', 'Top de sustentação média em malha compressiva reaproveitada.', 8900),
  ('Confecciones Erica', 'Corta-Vento de Tecido Reaproveitado', 'Corta-vento leve feito com nylon de barracas de camping descartadas.', 24900),

  -- Mistura — roupas
  ('Mistura', 'Kimono de Retalhos Estampados',    'Kimono montado com retalhos estampados combinados na diagonal.', 26900),
  ('Mistura', 'Camiseta Tie-Dye Reaproveitada',   'Camiseta manchada recuperada com tingimento tie-dye artesanal.', 10900),
  ('Mistura', 'Macacão de Brim Reconstruído',     'Macacão montado a partir de duas calças de brim descartadas.', 29900),

  -- Sena — completa as peças que os banners da Home anunciam
  ('Sena', 'Chaqueta de Retalhos sob Medida',     'Jaqueta de retalhos ajustada sob medida, a peça anunciada na vitrine.', 38900),
  ('Sena', 'Saia de Retalhos Corte A',            'Saia evasê montada com retalhos de lã e tweed em blocos de cor.', 28500),
  ('Sena', 'Colete de Retalhos Reversível',       'Colete com dois lados utilizáveis, cada um com combinação própria de retalhos.', 25900),
  ('Sena', 'Bolsa Artesanal de Firma',            'Bolsa estruturada em retalhos de couro e tecido, costurada à mão.', 34900)
) as v(marca, produto, descricao, preco)
join brands b on b.name = v.marca
where not exists (
  select 1 from products p where p.brand_id = b.id and p.name = v.produto
);

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select b.name as marca,
       count(p.id) filter (where p.status = 'active') as ativos,
       count(p.id) filter (where p.status = 'sold')   as vendidos,
       count(p.id) filter (where p.photo_url is null) as sem_foto
from brands b
left join products p on p.brand_id = b.id
group by b.name
order by b.name;
