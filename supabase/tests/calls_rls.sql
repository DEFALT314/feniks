-- Permission tests for calls (P4, #10). Run inside a rolled-back transaction:
--   (echo "begin;"; cat supabase/tests/calls_rls.sql; echo "rollback;") > /tmp/t.sql \
--     && pnpm exec supabase db query --linked -f /tmp/t.sql
-- Every row must have ok = true.

create temp table results (test text, ok boolean);
grant all on results to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c7', 'c-rops@example.org'),
  ('00000000-0000-4000-8000-0000000000c8', 'c-author@example.org');
update public.profiles set role = 'rops_admin' where id = '00000000-0000-4000-8000-0000000000c7';
insert into public.ideas (autor_id, tytul, obszar_id, wyslany_at) values
  ('00000000-0000-4000-8000-0000000000c8', 'Pomysł seniorzy', 'seniorzy', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c7","role":"authenticated"}', true);
insert into public.calls (id, nazwa, obszary, termin_do) values ('test-ukryty', 'Ukryty nabór', '{seniorzy}', '2026-12-01');
insert into public.calls (id, nazwa, obszary, opublikowany) values ('test-jawny', 'Jawny nabór', '{seniorzy}', true);
insert into results select 'ROPS adds calls and sees drafts', (select count(*) from public.calls where id like 'test-%') = 2;
update public.calls set termin_do = '2026-12-20' where id = 'test-ukryty';
insert into results select 'update keeps updated_by = ROPS user',
  (select updated_by = '00000000-0000-4000-8000-0000000000c7' from public.calls where id = 'test-ukryty');
insert into results select 'ROPS finds authors of matching ideas',
  (select array_agg(email) from public.call_matching_authors('{seniorzy}')) @> array['c-author@example.org'];
do $$ begin
  insert into public.calls (id, nazwa) values ('Zła Nazwa!', 'x');
  insert into results values ('invalid slug rejected', false);
exception when others then insert into results values ('invalid slug rejected', true);
end $$;
do $$ begin
  insert into public.calls (id, nazwa, termin_od, termin_do) values ('test-daty', 'Daty', '2026-12-01', '2026-11-01');
  insert into results values ('end before start rejected', false);
exception when others then insert into results values ('end before start rejected', true);
end $$;

reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c8","role":"authenticated"}', true);
insert into results select 'author sees only published calls',
  (select array_agg(id) from public.calls where id like 'test-%') = array['test-jawny'];
insert into results select 'author gets no e-mails from call_matching_authors',
  (select count(*) from public.call_matching_authors('{seniorzy}')) = 0;
update public.calls set nazwa = 'hacked' where id = 'test-jawny';
insert into results select 'author cannot edit calls',
  (select nazwa = 'Jawny nabór' from public.calls where id = 'test-jawny');
do $$ begin
  insert into public.calls (id, nazwa) values ('test-autor', 'Mój nabór');
  insert into results values ('author cannot add calls', false);
exception when others then insert into results values ('author cannot add calls', true);
end $$;

reset role; set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into results select 'anon sees published calls only',
  (select array_agg(id) from public.calls where id like 'test-%') = array['test-jawny'];

reset role;
select test, ok from results;
