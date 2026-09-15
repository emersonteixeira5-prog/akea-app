-- =====================================================================
-- logo_url da marca Akea
-- =====================================================================
-- PRÉ-REQUISITO: subir UM arquivo para o bucket `Logos` no painel
-- (Storage -> Logos -> Upload files), escolhendo entre:
--
--   assets/marcas/otimizadas/akea.jpg          (o camaleão, 512x512)
--   assets/marcas/otimizadas/akea-header.jpg   (o lockup horizontal)
--
-- Por padrão este script usa akea.jpg — o camaleão sozinho. No círculo
-- de 78px do app, o lockup horizontal encolhe para 54x21 e o
-- "MODA CIRCULAR" fica com ~3px de altura, ilegível. O símbolo sozinho
-- preenche o círculo e fica coerente com as outras 12 marcas, que também
-- usam o símbolo e não a assinatura completa.
--
-- Para usar o lockup mesmo assim, troque o nome do arquivo na linha
-- marcada abaixo.
-- =====================================================================

update brands
set logo_url = 'https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Logos/'
               || 'akea.jpg'          -- <<< troque para 'akea-header.jpg' se preferir o lockup
where name = 'Akea';

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select name,
       case when logo_url is null then '--- SEM LOGO ---'
            else regexp_replace(logo_url, '^.*/', '') end as logo
from brands
order by logo_url nulls first, name;
