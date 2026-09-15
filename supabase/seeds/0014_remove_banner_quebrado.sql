-- =====================================================================
-- Remove o banner do SENA, que aponta para arquivo inexistente
-- =====================================================================
-- O 0012 gravou a URL, mas o arquivo nunca chegou ao bucket Logos:
--
--   GET .../public/Logos/sena-terremoto.jpg
--   -> 400 {"statusCode":"404","error":"not_found","code":"NoSuchKey"}
--
-- Enquanto a linha existir, o carrossel da Home tem um quarto slide em
-- branco. Isto tira a linha e devolve o carrossel aos três que
-- funcionam (conferidos: 200 image/png).
--
-- NÃO É DESISTIR DA IMAGEM. É voltar a um estado íntegro enquanto o
-- envio para o Storage não é resolvido. Quando o arquivo estiver mesmo
-- no bucket, é só rodar o 0012 de novo — ele tem guarda de duplicata,
-- então não cria duas linhas.
-- =====================================================================

delete from banners
where image_url like '%sena-terremoto.jpg'
returning sort_order, image_url, 'REMOVIDO' as situacao;
