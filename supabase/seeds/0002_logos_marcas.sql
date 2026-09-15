-- =====================================================================
-- logo_url das marcas parceiras
-- =====================================================================
-- PRÉ-REQUISITO: subir os 13 arquivos de assets/marcas/ para o bucket
-- `Logos` (L maiúsculo) no painel: Storage -> Logos -> Upload files.
-- Mantenha os nomes originais — este script depende deles.
--
-- O mapeamento arquivo -> marca foi feito olhando cada imagem. Confira a
-- consulta final: se alguma logo estiver na marca errada, é só trocar a
-- linha correspondente e rodar de novo (o update é idempotente).
--
-- NÃO COBERTO: a marca "Akea" não tem arquivo de logo entre os enviados,
-- então continua sem. Os arquivos 06 e 11 são a mesma arte (JJ
-- Confecciones); uso o 06 e o 11 fica sobrando no bucket.
-- =====================================================================

do $$
declare
  v_base text := 'https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Logos/';
  v_arquivo text;
  v_marca text;
  v_pares text[][] := array[
    ['Towa Dolls',              'Marcas de akea-01.jpg.jpeg'],
    ['Angela Morales',          'Marcas de akea-02.jpg.jpeg'],
    ['Yasmin',                  'Marcas de akea-03.jpg.jpeg'],
    ['VL Diseños Innovadores',  'Marcas de akea-04.jpg.jpeg'],
    ['ByG Bolsos y Accesorios', 'Marcas de akea-05.jpg.jpeg'],
    ['JJ Confecciones',         'Marcas de akea-06.jpg.jpeg'],
    ['Mistura',                 'Marcas de akea-07.jpg.jpeg'],
    ['AK Fashion',              'Marcas de akea-08.jpg.jpeg'],
    ['Confecciones Erica',      'Marcas de akea-09.jpg.jpeg'],
    ['Diseños Amalia',          'Marcas de akea-10.jpg.jpeg'],
    ['Rivieras Confección',     'Marcas de akea-12.jpg.jpeg']
  ];
  i int;
begin
  for i in 1 .. array_length(v_pares, 1) loop
    v_marca   := v_pares[i][1];
    v_arquivo := v_pares[i][2];

    -- replace(..., ' ', '%20'): o nome tem espaços e vai numa URL.
    update brands
    set logo_url = v_base || replace(v_arquivo, ' ', '%20')
    where name = v_marca;

    if not found then
      raise notice 'Marca não encontrada, pulei: %', v_marca;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select name,
       case when logo_url is null then '--- SEM LOGO ---'
            else right(logo_url, 30) end as arquivo_da_logo
from brands
order by logo_url nulls first, name;
