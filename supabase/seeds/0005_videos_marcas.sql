-- =====================================================================
-- video_url das marcas — "Conheça a marca"
-- =====================================================================
-- PRÉ-REQUISITO: subir os arquivos de vídeo para o bucket `Videos`
-- (V maiúsculo) no painel: Storage -> Videos -> Upload files.
--
-- Depois, preencha a lista abaixo com o nome de cada arquivo e rode.
-- Marca sem vídeo é só deixar de fora — a seção "Conheça a marca"
-- simplesmente não aparece no perfil, sem erro nem espaço vazio.
--
-- FORMATO: MP4 com codec H.264 e áudio AAC. Foi exatamente isso que nos
-- mordeu antes: os vídeos de demonstração antigos respondiam 403 com
-- content-type application/xml, e o player levantava NotSupportedError.
-- O app trata esse caso (mostra um aviso no lugar do player), mas o certo
-- é o arquivo abrir.
--
-- TAMANHO: o vídeo é baixado inteiro no perfil da marca. Acima de ~10 MB
-- a espera fica perceptível em rede móvel; 720p e até 30s costuma bastar.
-- =====================================================================

do $$
declare
  v_base text := 'https://etpsmssnwlacpjdqbndf.supabase.co/storage/v1/object/public/Videos/';
  v_marca text;
  v_arquivo text;
  v_pares text[][] := array[
    -- ['Nome exato da marca', 'nome-do-arquivo.mp4'],
    ['Akea',                    'akea.mp4'],
    ['Towa Dolls',              'towa-dolls.mp4']
    -- acrescente as demais aqui, seguindo o mesmo padrão
  ];
  i int;
begin
  for i in 1 .. array_length(v_pares, 1) loop
    v_marca   := v_pares[i][1];
    v_arquivo := v_pares[i][2];

    -- replace: nomes com espaço precisam ser escapados na URL.
    update brands
    set video_url = v_base || replace(v_arquivo, ' ', '%20')
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
       case when video_url is null then 'sem vídeo (seção não aparece)'
            else regexp_replace(video_url, '^.*/', '') end as video
from brands
order by video_url nulls last, name;
