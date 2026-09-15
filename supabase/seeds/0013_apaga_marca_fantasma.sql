-- =====================================================================
-- Apaga a marca fantasma "emerson brandao"
-- =====================================================================
-- UM ÚNICO COMANDO, e devolve a linha que apagou. Se o painel disser
-- "No rows returned", ela já não existia.
--
-- O QUE É: marca criada pelo CompletarPerfilMarcaScreen em 14/09/2026
-- 07:42 UTC, quando o app entrou em modo marca antes de as 12 marcas
-- terem sido desambiguadas. O maybeSingle() falhou com 13 linhas, o
-- código caiu no ramo de insert (CompletarPerfilMarcaScreen.tsx:74) e
-- criou uma marca com o nome do perfil. Aparece na vitrine pública.
--
-- SEGURO DE APAGAR: zero produtos, zero doações, zero pedidos —
-- reconferido por REST agora, não só quando a descobri.
--
-- ISTO É SÓ O DELETE. Não desfaz o modo marca: sua conta continua
-- 'brand' e as 11 marcas continuam estacionadas no outro dono, para
-- você ainda conseguir subir a logo da Akea pela tela de Perfil. A
-- reversão completa está em 0010_reverter_modo_marca.sql, para rodar
-- depois que a logo subir. O 0010 também tenta apagar esta marca, e
-- rodar os dois não dá erro — o segundo simplesmente não acha nada.
-- =====================================================================

delete from brands
where id = 'ac047884-a35e-48ee-8209-5cb899ee5eae'
  and name = 'emerson brandao'          -- guarda dupla: id E nome têm que bater
returning id, name, 'APAGADA' as situacao;
