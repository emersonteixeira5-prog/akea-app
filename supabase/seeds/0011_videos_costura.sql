-- =====================================================================
-- video_url das marcas — clipes reais de costura
-- =====================================================================
-- UM ÚNICO COMANDO, de propósito. A versão anterior usava um bloco
-- do $$ ... end $$ seguido de um select de conferência, e rodou sem
-- aplicar nada — provavelmente porque só parte do texto chegou ao
-- servidor. Aqui, se a colagem vier cortada, dá erro de sintaxe em vez
-- de não fazer nada calado.
--
-- O `returning` no fim faz o próprio comando devolver o que alterou:
-- o painel mostra uma linha por marca atualizada. Esperado: 13 linhas.
-- Se vier "No rows returned", nenhuma marca bateu pelo nome — e aí o
-- problema é o projeto, não o script.
--
-- SUBSTITUI o 0006_videos_e_bios.sql (parte 1), que punha amostras de
-- teste sem relação com moda: flor, medusa, Big Buck Bunny, Sintel.
--
-- SÃO VÍDEOS DE BANCO, NÃO DAS MARCAS. Mostram o ofício, não a oficina
-- de cada uma. Cada marca sobe o vídeo dela pela tela de Perfil, que
-- grava no bucket Videos — ver 0005_videos_marcas.sql.
--
-- FONTE E LICENÇA: Pexels, livre para uso comercial, sem exigência de
-- atribuição. O número na URL é o id da página: pexels.com/video/<id>/
--
-- CONFERIDOS UM A UM antes de escrever isto: respondem 206 com
-- content-type video/mp4 sem User-Agent de navegador, sem Referer, e
-- aceitam pedido de intervalo — que é o que o player precisa para
-- buscar posição. Os vídeos antigos devolviam 403 com application/xml.
--
-- PESO: todos entre 2 e 9 MB. Descartei as versões 4K (havia de 44, 67 e
-- 82 MB) porque o perfil da marca baixa o vídeo inteiro ao abrir.
-- =====================================================================

update brands b
set video_url = 'https://videos.pexels.com/video-files/' || v.arq
from (values
  -- oficina de confecção, plano aberto — o mais parecido com a foto do SENA
  ('Sena',                    '36066883/15296056_1920_1080_24fps.mp4'),  -- 7,4 MB

  ('Akea',                    '6459900/6459900-uhd_2560_1080_25fps.mp4'),  -- 7,1 MB
  ('Towa Dolls',              '6459961/6459961-hd_1080_1920_30fps.mp4'),   -- 2,1 MB, linha
  ('Angela Morales',          '6460176/6460176-hd_1920_1080_25fps.mp4'),   -- 5,1 MB, molde
  ('ByG Bolsos y Accesorios', '6424129/6424129-hd_1920_1080_25fps.mp4'),   -- 4,0 MB
  ('AK Fashion',              '6460113/6460113-hd_1920_1080_25fps.mp4'),   -- 3,9 MB
  ('VL Diseños Innovadores',  '6459913/6459913-uhd_2560_1080_25fps.mp4'),  -- 4,7 MB
  ('Yasmin',                  '7998309/7998309-hd_1080_1920_24fps.mp4'),   -- 4,7 MB
  ('JJ Confecciones',         '6459956/6459956-hd_1080_1920_30fps.mp4'),   -- 6,3 MB
  ('Rivieras Confección',     '6459908/6459908-uhd_2560_1080_25fps.mp4'),  -- 9,3 MB

  -- 10 clipes para 13 marcas: estes três repetem. Preferi repetir a pôr
  -- um vídeo de 45 MB só para não repetir.
  ('Diseños Amalia',          '6460176/6460176-hd_1920_1080_25fps.mp4'),
  ('Confecciones Erica',      '6460113/6460113-hd_1920_1080_25fps.mp4'),
  ('Mistura',                 '6424129/6424129-hd_1920_1080_25fps.mp4')
) as v(marca, arq)
where b.name = v.marca
returning b.name as marca_atualizada,
          regexp_replace(b.video_url, '^.*video-files/([0-9]+)/.*$', 'costura \1') as video;
