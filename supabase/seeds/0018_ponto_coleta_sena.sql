-- Ponto de coleta da Sena. Um comando só, e devolve a linha que alterou.
-- Esperado: 1 linha, com o endereço novo.
--
-- Substitui 'Sena norte', que era nome de região e não endereço.
-- As outras 12 marcas continuam no 0017_pontos_de_coleta.sql, para
-- preencher quando os endereços chegarem.

update brands
set pickup_address = 'Centro de Teleinformática y Producción Industrial, SENA Regional Cauca, Popayán'
where name = 'Sena'
returning name, pickup_address;
