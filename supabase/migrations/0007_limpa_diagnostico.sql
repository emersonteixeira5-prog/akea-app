-- Apaga o texto de diagnóstico que o 0006 gravou no website_url da Akea.
-- Rodar quando quiser; não afeta a compra.

update brands set website_url = null where name = 'Akea';

select name, coalesce(website_url, '(vazio)') as website_url
from brands where name = 'Akea';
