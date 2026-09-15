-- =====================================================================
-- Pontos de coleta das marcas
-- =====================================================================
-- PREENCHER antes de rodar. Só isto: escreva o endereço entre as aspas,
-- na linha da marca. Deixe '' nas que ainda não souber — linha vazia é
-- pulada, não grava nada.
--
-- POR QUE ESTE CAMPO IMPORTA: é o endereço que o app mostra a quem vai
-- levar uma peça para doar. Endereço errado manda a pessoa ao lugar
-- errado; endereço vazio faz a marca não aparecer como opção de doação.
-- E como a doação é o que credita pontos de impacto, que viram desconto
-- na compra, o circuito inteiro do app depende disto.
--
-- FORMATO SUGERIDO: rua e número, bairro, cidade — e, se ajudar quem vai
-- até lá, uma referência. Exemplo:
--   'Cra. 5 #12-34, Barrio Centro, Popayán — al lado de la panadería'
--
-- Pode rodar quantas vezes quiser, preenchendo aos poucos.
-- =====================================================================

update brands b
set pickup_address = btrim(v.endereco)
from (values
  ('Akea',                    ''),
  ('Towa Dolls',              ''),
  ('Angela Morales',          ''),
  ('ByG Bolsos y Accesorios', ''),
  ('AK Fashion',              ''),
  ('VL Diseños Innovadores',  ''),
  ('Yasmin',                  ''),
  ('JJ Confecciones',         ''),
  ('Rivieras Confección',     ''),
  ('Diseños Amalia',          ''),
  ('Confecciones Erica',      ''),
  ('Mistura',                 ''),
  -- Único preenchido até agora. Substitui o 'Sena norte' que estava lá,
  -- que era nome de região e não endereço.
  ('Sena', 'Centro de Teleinformática y Producción Industrial, SENA Regional Cauca, Popayán')
) as v(marca, endereco)
where b.name = v.marca
  and btrim(v.endereco) <> '';

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
-- Comando separado de propósito: dentro de uma CTE o select enxergaria o
-- estado anterior ao update, e mostraria como faltando o que acabou de
-- ser gravado.
select name,
       coalesce(pickup_address, '--- FALTA ---') as ponto_de_coleta
from brands
order by (pickup_address is null) desc, name;
