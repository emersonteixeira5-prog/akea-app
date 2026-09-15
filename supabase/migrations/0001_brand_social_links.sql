-- Links sociais das marcas parceiras.
-- `instagram` (handle) já existia; estas colunas guardam URLs explícitas.
-- `instagram_url` é opcional e sobrepõe o handle quando preenchida.
alter table brands add column if not exists instagram_url text;
alter table brands add column if not exists website_url text;
