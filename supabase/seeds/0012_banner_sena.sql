-- =====================================================================
-- Banner do SENA — carrossel do topo da Home
-- =====================================================================
-- PRÉ-REQUISITO, e é ele que ainda falta: subir o arquivo
--
--     assets/banner/sena-terremoto.jpg      (1500x625, 160 KB)
--
-- para o bucket `Logos` no painel (Storage -> Logos -> Upload files).
-- Salvar em assets/banner/ deixa o arquivo no seu disco; a tabela guarda
-- uma URL, e o app busca pela rede. Sem o arquivo no bucket esta linha
-- aponta para o vazio e o banner fica quebrado — foi o que aconteceu com
-- a logo da Akea no 0008.
--
-- CONFIRA ANTES DE RODAR: abra a URL abaixo no navegador. Se vier
-- "Bucket not found" ou um XML de erro, o arquivo não subiu e rodar isto
-- só vai colocar um banner quebrado no ar.
--
--   https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Logos/sena-terremoto.jpg
--
-- POR QUE A VERSÃO OTIMIZADA: o original tem 5000x2083 e 762 KB. O
-- carrossel renderiza em ~2.34:1 com altura de 160, então nada acima de
-- 1500px de largura aparece — só pesa no carregamento. A proporção 2.4
-- da versão reduzida é quase idêntica à da tela; o `cover` corta uns 2%
-- nas laterais, o texto não é afetado.
--
-- CONTEÚDO: é peça institucional do SENA sobre doação a famílias
-- atingidas pelo terremoto na Colômbia, com marca e texto deles. No
-- carrossel da Home ela aparece como comunicação do app para qualquer
-- pessoa que abrir. Você confirmou que é intencional.
-- =====================================================================

insert into banners (image_url, sort_order)
select 'https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Logos/sena-terremoto.jpg',
       3          -- <<< ordem no carrossel. Os três atuais são 0, 1 e 2.
                  --     Troque para -1 se quiser que este apareça primeiro.
where not exists (
  select 1 from banners
  where image_url like '%sena-terremoto.jpg'
);

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select sort_order,
       regexp_replace(image_url, '^.*/', '') as arquivo
from banners
order by sort_order;
