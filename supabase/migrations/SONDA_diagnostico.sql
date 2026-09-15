-- =====================================================================
-- SONDA — descobre o que está acontecendo, sem você transcrever nada
-- =====================================================================
-- Rodar no SQL Editor com o editor vazio e NADA selecionado.
--
-- Cria uma tabelinha que eu consigo ler pela API, e escreve nela a
-- resposta de duas perguntas que só o banco sabe:
--
--   1. a função finalizar_compra existe?
--   2. o gatilho on_order_item_guard existe?
--
-- E, de quebra, testa uma terceira: se eu NÃO conseguir ler esta tabela
-- depois de você rodar, então o cache de schema do PostgREST está
-- congelado — e era esse o motivo de eu não enxergar a função, não a
-- migração ter falhado.
--
-- É descartável. O SONDA_limpar.sql apaga tudo depois.
-- =====================================================================

create table if not exists public.sonda_diagnostico (
  id             integer primary key,
  funcao_existe  boolean,
  gatilho_existe boolean,
  n_funcoes      integer,
  visto_em       timestamptz default now()
);

alter table public.sonda_diagnostico enable row level security;

drop policy if exists sonda_leitura on public.sonda_diagnostico;
create policy sonda_leitura on public.sonda_diagnostico for select using (true);

grant select on public.sonda_diagnostico to anon, authenticated;

insert into public.sonda_diagnostico (id, funcao_existe, gatilho_existe, n_funcoes)
values (
  1,
  (select exists (select 1 from pg_proc
                   where proname = 'finalizar_compra'
                     and pronamespace = 'public'::regnamespace)),
  (select exists (select 1 from pg_trigger
                   where tgname = 'on_order_item_guard'
                     and not tgisinternal)),
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace)
)
on conflict (id) do update
set funcao_existe  = excluded.funcao_existe,
    gatilho_existe = excluded.gatilho_existe,
    n_funcoes      = excluded.n_funcoes,
    visto_em       = now();

-- Conferência — última consulta, é o que o painel exibe
select * from public.sonda_diagnostico;
