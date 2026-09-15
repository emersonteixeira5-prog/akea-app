-- =====================================================================
-- logo_url apontando para as versões otimizadas
-- =====================================================================
-- PRÉ-REQUISITO: subir os arquivos de assets/marcas/otimizadas/ para o
-- bucket `Logos` no painel (Storage -> Logos -> Upload files).
-- São 11 arquivos .jpg com nomes limpos, sem espaço — não precisa
-- renomear nada.
--
-- O que muda: as logos passam de ~3,6 MB somados para ~340 KB. Cada arte
-- foi reamostrada para 512px (LANCZOS, JPEG qualidade 88), o que cobre com
-- folga o maior uso na tela — o círculo de 88px do perfil da marca, que em
-- densidade 3x pede 264px.
--
-- NÃO INCLUÍDO:
--   * Sena — já está em 734px / 101 KB, tamanho razoável, e a marca é de
--     outro dono. Linha pronta no fim, comentada, caso queira trocar.
--   * Akea — continua sem logo, não veio arquivo.
--
-- DEPOIS de conferir no app, os 13 arquivos antigos ("Marcas de akea-NN
-- .jpg.jpeg") podem ser apagados do bucket: nenhuma marca aponta mais
-- para eles.
-- =====================================================================

do $$
declare
  v_base text := 'https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Logos/';
  v_marca text;
  v_arquivo text;
  v_pares text[][] := array[
    ['Towa Dolls',              'towa-dolls.jpg'],
    ['Angela Morales',          'angela-morales.jpg'],
    ['Yasmin',                  'yasmin.jpg'],
    ['VL Diseños Innovadores',  'vl-disenos-innovadores.jpg'],
    ['ByG Bolsos y Accesorios', 'byg-bolsos-y-accesorios.jpg'],
    ['JJ Confecciones',         'jj-confecciones.jpg'],
    ['Mistura',                 'mistura.jpg'],
    ['AK Fashion',              'ak-fashion.jpg'],
    ['Confecciones Erica',      'confecciones-erica.jpg'],
    ['Diseños Amalia',          'disenos-amalia.jpg'],
    ['Rivieras Confección',     'rivieras-confeccion.jpg']
  ];
  i int;
begin
  for i in 1 .. array_length(v_pares, 1) loop
    v_marca   := v_pares[i][1];
    v_arquivo := v_pares[i][2];

    update brands set logo_url = v_base || v_arquivo where name = v_marca;

    if not found then
      raise notice 'Marca não encontrada, pulei: %', v_marca;
    end if;
  end loop;
end $$;

-- Opcional — trocar também a Sena pela versão de 512px:
-- update brands set logo_url =
--   'https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Logos/sena.jpg'
-- where name = 'Sena';

-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select name,
       case when logo_url is null then '--- SEM LOGO ---'
            else regexp_replace(logo_url, '^.*/', '') end as arquivo,
       case when logo_url like '%Marcas%20de%' then 'ANTIGA (pesada)'
            when logo_url is null then '-'
            else 'ok' end as versao
from brands
order by versao, name;
