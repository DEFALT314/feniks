-- Permission tests for good practices (P2, #104): author consent, ROPS publication, public read.
-- Run inside a rolled-back transaction:
--   (echo "begin;"; cat supabase/tests/good_practices_rls.sql; echo "rollback;") > /tmp/t.sql \
--     && pnpm exec supabase db query --linked -f /tmp/t.sql
-- Needs the challenge area "seniorzy" from seed.sql. Every row must have ok = true.

create temp table results (test text, ok boolean);
grant all on results to authenticated, anon;

-- Raises when the statement succeeds, so `exception when others` below only counts a refusal
create function pg_temp.expect_error(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.expect_error(text) to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000101', 'test-gp-author@example.org'),
  ('00000000-0000-4000-8000-000000000102', 'test-gp-other@example.org'),
  ('00000000-0000-4000-8000-000000000103', 'test-gp-rops@example.org'),
  ('00000000-0000-4000-8000-000000000104', 'test-gp-r1@example.org'),
  ('00000000-0000-4000-8000-000000000105', 'test-gp-r2@example.org'),
  ('00000000-0000-4000-8000-000000000106', 'test-gp-r3@example.org');
update public.profiles set role = 'rops_redaktor' where id = '00000000-0000-4000-8000-000000000103';

-- p1: sent and approved; p2: sent, not reviewed; p3: draft
insert into public.ideas (id, autor_id, tytul, opis, istota, dla_kogo, etap, obszar_id, wyslany_at) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Dobra praktyka',
   'Opis', 'Istota', 'Seniorzy', 'przetestowane', 'seniorzy', now() - interval '2 hours'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Czeka na ROPS',
   'Opis', 'Istota', 'Seniorzy', 'pomysl', null, now() - interval '1 hour'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 'Szkic',
   null, null, null, null, null, null);
insert into public.idea_reviews (idea_id, status, reviewer_id, created_at) values
  ('00000000-0000-4000-8000-000000000201', 'zatwierdzony', '00000000-0000-4000-8000-000000000103', now() - interval '1 hour');
-- Two ratings from a test with residents (a third comes later)
insert into public.tests (id, idea_id, tytul) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'Test z mieszkańcami');
insert into public.test_signups (test_id, user_id) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000104'),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000105'),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000106');
insert into public.test_ratings (test_id, user_id, ocena) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000104', 5),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000105', 4);

-- ---------- as the author ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
insert into results select 'author cannot write the consent column directly',
  pg_temp.expect_error($q$update public.ideas set zgoda_publikacji_at = now()
    where id = '00000000-0000-4000-8000-000000000201'$q$);
insert into results select 'author cannot publish through the column',
  pg_temp.expect_error($q$update public.ideas set opublikowany_at = now()
    where id = '00000000-0000-4000-8000-000000000201'$q$);
insert into results select 'author gives consent on a sent (locked) idea',
  public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000201', true) = 'zgoda';
insert into results select 'consent is stored with a time',
  (select zgoda_publikacji_at is not null from public.ideas where id = '00000000-0000-4000-8000-000000000201');
insert into results select 'author cannot publish through the ROPS function',
  pg_temp.expect_error($q$select public.opublikuj_pomysl('00000000-0000-4000-8000-000000000201', true)$q$);
insert into results select 'author cannot call the internal status helper',
  pg_temp.expect_error($q$select public.idea_current_status('00000000-0000-4000-8000-000000000201')$q$);
insert into results select 'consent on another idea of the author (not reviewed)',
  public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000202', true) = 'zgoda';

-- ---------- as another user ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
insert into results select 'another user cannot consent for the author',
  pg_temp.expect_error($q$select public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000201', false)$q$);

-- ---------- as ROPS ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
insert into results select 'ROPS cannot publish an idea that is not approved',
  pg_temp.expect_error($q$select public.opublikuj_pomysl('00000000-0000-4000-8000-000000000202', true)$q$);
insert into results select 'ROPS cannot publish a draft',
  pg_temp.expect_error($q$select public.opublikuj_pomysl('00000000-0000-4000-8000-000000000203', true)$q$);
insert into results select 'ROPS publishes an approved idea with consent',
  public.opublikuj_pomysl('00000000-0000-4000-8000-000000000201', true) = 'opublikowany';
insert into results select 'publishing twice changes nothing',
  public.opublikuj_pomysl('00000000-0000-4000-8000-000000000201', true) = 'bez_zmian';
insert into results select 'ROPS cannot set the author''s consent',
  pg_temp.expect_error($q$select public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000201', false)$q$);

-- ---------- as anyone (anon) ----------
reset role; set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into results select 'anon sees exactly the published practice',
  (select array_agg(id) = array['00000000-0000-4000-8000-000000000201'::uuid]
   from public.dobre_praktyki() where id::text like '00000000-0000-4000-8000-0000000002__');
insert into results select 'the practice has the card fields and the area name',
  (select tytul = 'Dobra praktyka' and istota = 'Istota' and etap = 'przetestowane'
     and obszar_nazwa is not null and opublikowany_at is not null
   from public.dobre_praktyki('00000000-0000-4000-8000-000000000201'));
insert into results select 'the author is never part of a practice',
  (select not (row_to_json(p)::jsonb ?| array['autor_id', 'wyslany_at', 'zgoda_publikacji_at'])
   from public.dobre_praktyki('00000000-0000-4000-8000-000000000201') p);
insert into results select 'two ratings: counted, no average (fewer than three)',
  (select liczba_ocen = 2 and srednia_ocena is null
   from public.dobre_praktyki('00000000-0000-4000-8000-000000000201'));
insert into results select 'anon still cannot read ideas directly',
  (select count(*) = 0 from public.ideas where id = '00000000-0000-4000-8000-000000000201');
insert into results select 'anon cannot give consent',
  pg_temp.expect_error($q$select public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000201', true)$q$);
insert into results select 'anon cannot publish',
  pg_temp.expect_error($q$select public.opublikuj_pomysl('00000000-0000-4000-8000-000000000201', true)$q$);

-- A third rating: the average appears, rounded to one decimal
reset role;
insert into public.test_ratings (test_id, user_id, ocena) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000106', 4);
set local role anon;
insert into results select 'three ratings: the average is shown',
  (select liczba_ocen = 3 and srednia_ocena = 4.3
   from public.dobre_praktyki('00000000-0000-4000-8000-000000000201'));

-- ---------- the author withdraws consent ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
insert into results select 'withdrawing consent of a published practice reports it was hidden',
  public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000201', false) = 'ukryty';
insert into results select 'withdrawal clears consent and publication',
  (select zgoda_publikacji_at is null and opublikowany_at is null
   from public.ideas where id = '00000000-0000-4000-8000-000000000201');
insert into results select 'giving consent again does not republish by itself',
  public.ustaw_zgode_publikacji('00000000-0000-4000-8000-000000000201', true) = 'zgoda'
  and (select count(*) = 0 from public.dobre_praktyki('00000000-0000-4000-8000-000000000201'));

-- ---------- a later ROPS decision hides it ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
insert into results select 'ROPS publishes again after the new consent',
  public.opublikuj_pomysl('00000000-0000-4000-8000-000000000201', true) = 'opublikowany';
insert into public.idea_reviews (idea_id, status, komentarz) values
  ('00000000-0000-4000-8000-000000000201', 'do_poprawy', 'Dopisz koszty');
insert into results select 'a decision other than approval ends the publication',
  (select opublikowany_at is null from public.ideas where id = '00000000-0000-4000-8000-000000000201');
insert into results select 'the practice is gone from the public list',
  (select count(*) = 0 from public.dobre_praktyki('00000000-0000-4000-8000-000000000201'));
insert into results select 'ROPS hiding an unpublished idea changes nothing',
  public.opublikuj_pomysl('00000000-0000-4000-8000-000000000201', false) = 'bez_zmian';

reset role;
select test, ok from results order by ok, test;
