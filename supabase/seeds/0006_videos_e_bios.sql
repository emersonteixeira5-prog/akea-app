-- =====================================================================
-- Vídeos de demonstração + bios das marcas
-- =====================================================================
-- Rodar no SQL Editor, com nada selecionado no editor.
--
-- ATENÇÃO — OS VÍDEOS SÃO PREENCHIMENTO, NÃO CONTEÚDO.
-- São seis amostras públicas (flor, medusa, Big Buck Bunny, Sintel)
-- distribuídas entre as 13 marcas. Elas fazem a seção "Conheça a marca"
-- aparecer para você ver a página montada, mas não têm relação nenhuma
-- com as marcas. Antes de mostrar o app para alguém, troque pelos vídeos
-- reais — ver 0005_videos_marcas.sql, que aponta para o bucket Videos.
--
-- E SÃO LINKS EXTERNOS. Se esses sites saírem do ar, os vídeos quebram.
-- O app trata isso: mostra um aviso no lugar do player em vez de falhar
-- em silêncio. Vídeo próprio, no bucket Videos, não tem esse risco.
-- =====================================================================


-- =====================================================================
-- PARTE 1 — vídeos
-- =====================================================================
do $$
declare
  v_marca text;
  v_video text;
  v_pares text[][] := array[
    ['Akea',                    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
    ['Towa Dolls',              'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'],
    ['Angela Morales',          'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'],
    ['ByG Bolsos y Accesorios', 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4'],
    ['AK Fashion',              'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4'],
    ['VL Diseños Innovadores',  'https://filesamples.com/samples/video/mp4/sample_640x360.mp4'],
    ['Yasmin',                  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
    ['JJ Confecciones',         'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'],
    ['Rivieras Confección',     'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'],
    ['Diseños Amalia',          'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4'],
    ['Confecciones Erica',      'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4'],
    ['Mistura',                 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4'],
    ['Sena',                    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4']
  ];
  i int;
begin
  for i in 1 .. array_length(v_pares, 1) loop
    v_marca := v_pares[i][1];
    v_video := v_pares[i][2];
    update brands set video_url = v_video where name = v_marca;
    if not found then raise notice 'Marca não encontrada: %', v_marca; end if;
  end loop;
end $$;


-- =====================================================================
-- PARTE 2 — bios
-- =====================================================================
-- Escritas por mim a partir do ramo de cada marca. São textos de
-- exemplo: apague este bloco inteiro se preferir escrever os seus, ou
-- edite depois pela tela de configuração da marca no app.
--
-- Só preenche onde está nulo ou vazio — a bio da Akea ("Moda"), que
-- você escreveu, fica intacta.

do $$
declare
  v_marca text;
  v_bio text;
  v_pares text[][] := array[
    ['Towa Dolls',              'Bonecas de pano costuradas à mão, cada uma montada com as sobras de tecido da semana.'],
    ['Angela Morales',          'Arte e costura: peças reconstruídas a partir de tecidos doados, com bordado feito à mão.'],
    ['ByG Bolsos y Accesorios', 'Bolsas e acessórios em couro e tecido reaproveitados, com acabamento artesanal.'],
    ['AK Fashion',              'Moda circular que transforma retalhos têxteis em peças únicas, bonitas e sustentáveis.'],
    ['VL Diseños Innovadores',  'Design autoral em patchwork geométrico, feito com malha e brim resgatados.'],
    ['Yasmin',                  'Convertendo um sonho em realidade: vestidos e blusas de tecidos resgatados.'],
    ['JJ Confecciones',         'Alfaiataria de reuso — camisas, calças e blazers reconstruídos peça por peça.'],
    ['Rivieras Confección',     'Confecção sob medida com tecidos nobres recuperados: cetim, seda e alfaiataria.'],
    ['Diseños Amalia',          'Peças em tons suaves, tingidas à mão sobre tecidos brancos resgatados.'],
    ['Confecciones Erica',      'Roupa esportiva feita com malha reciclada e costura plana, para treinar sem culpa.'],
    ['Mistura',                 'Kimonos e peças soltas montados com retalhos estampados combinados na diagonal.'],
    ['Sena',                    'Formação e produção em moda circular, transformando têxteis descartados em peças novas.']
  ];
  i int;
begin
  for i in 1 .. array_length(v_pares, 1) loop
    v_marca := v_pares[i][1];
    v_bio   := v_pares[i][2];
    update brands set bio = v_bio
    where name = v_marca and (bio is null or btrim(bio) = '');
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- Conferência — última consulta, é o que o painel exibe
-- ---------------------------------------------------------------------
select name,
       case when video_url is null then 'SEM VIDEO' else 'ok' end as video,
       case when bio is null or btrim(bio) = '' then 'SEM BIO' else left(bio, 40) || '...' end as bio,
       case when logo_url is null then 'SEM LOGO' else 'ok' end as logo
from brands
order by name;
