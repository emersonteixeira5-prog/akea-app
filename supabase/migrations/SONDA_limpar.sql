-- Apaga a tabela de diagnóstico. Rodar depois que eu tiver lido a sonda.
drop table if exists public.sonda_diagnostico;

select 'sonda removida' as situacao;
