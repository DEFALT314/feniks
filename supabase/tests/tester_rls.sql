-- Permission tests for the innovation tester (P2, #36). Run inside a rolled-back transaction:
--   (echo "begin;"; cat supabase/tests/tester_rls.sql; echo "rollback;") > /tmp/t.sql \
--     && pnpm exec supabase db query --linked -f /tmp/t.sql
-- Needs the innovation "merkury" from seed.sql. Every row must have ok = true.

create temp table results (test text, ok boolean);
grant all on results to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000e1', 'test-idea-author@example.org'),
  ('00000000-0000-4000-8000-0000000000e2', 'test-resident@example.org'),
  ('00000000-0000-4000-8000-0000000000e3', 'test-rops@example.org'),
  ('00000000-0000-4000-8000-0000000000e4', 'test-resident2@example.org');
update public.profiles set role = 'rops_redaktor' where id = '00000000-0000-4000-8000-0000000000e3';
insert into public.ideas (id, autor_id, tytul) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000e1', 'Test idea');
insert into public.tests (id, idea_id, innowacja_id, tytul, liczba_miejsc, termin) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000f1', null, 'Idea test, one seat', 1, now() + interval '7 days'),
  ('00000000-0000-4000-8000-0000000000a2', null, 'merkury', 'Innovation test', 5, null),
  ('00000000-0000-4000-8000-0000000000a3', null, 'merkury', 'Past test', null, now() - interval '1 day');

-- ---------- as a resident ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
insert into results select 'resident sees every test', (select count(*) = 3 from public.tests
  where id::text like '00000000-0000-4000-8000-0000000000a_');
do $$ begin
  insert into public.tests (idea_id, tytul) values ('00000000-0000-4000-8000-0000000000f1', 'Not mine');
  insert into results values ('resident cannot add a test to someone else''s idea', false);
exception when others then insert into results values ('resident cannot add a test to someone else''s idea', true);
end $$;
do $$ begin
  insert into public.tests (innowacja_id, tytul) values ('merkury', 'Not ROPS');
  insert into results values ('resident cannot add an innovation test', false);
exception when others then insert into results values ('resident cannot add an innovation test', true);
end $$;
insert into public.test_signups (test_id) values ('00000000-0000-4000-8000-0000000000a1');
insert into results select 'resident signs up', (select count(*) = 1 from public.test_signups
  where test_id = '00000000-0000-4000-8000-0000000000a1');
insert into results select 'seat count is visible',
  (select zajete = 1 from public.test_seats_taken(array['00000000-0000-4000-8000-0000000000a1'::uuid]));
do $$ begin
  update public.test_signups set test_id = '00000000-0000-4000-8000-0000000000a3';
  insert into results values ('a sign-up cannot be moved to another test', false);
exception when others then insert into results values ('a sign-up cannot be moved to another test', true);
end $$;
do $$ begin
  insert into public.test_signups (test_id) values ('00000000-0000-4000-8000-0000000000a3');
  insert into results values ('no sign-ups after the date of the test', false);
exception when sqlstate 'HM410' then insert into results values ('no sign-ups after the date of the test', true);
end $$;
do $$ begin
  insert into public.test_ratings (test_id, ocena) values ('00000000-0000-4000-8000-0000000000a2', 4);
  insert into results values ('no rating without a sign-up', false);
exception when others then insert into results values ('no rating without a sign-up', true);
end $$;
do $$ begin
  insert into public.test_ratings (test_id, ocena) values ('00000000-0000-4000-8000-0000000000a1', 6);
  insert into results values ('rating stays within 1-5', false);
exception when others then insert into results values ('rating stays within 1-5', true);
end $$;
insert into public.test_ratings (test_id, ocena, co_dzialalo, co_poprawic)
  values ('00000000-0000-4000-8000-0000000000a1', 4, 'Dużo rozmów', 'Większe litery');
insert into public.test_signups (test_id) values ('00000000-0000-4000-8000-0000000000a2');
insert into public.test_ratings (test_id, ocena) values ('00000000-0000-4000-8000-0000000000a2', 5);
update public.test_ratings set ocena = 3 where test_id = '00000000-0000-4000-8000-0000000000a1';
insert into results select 'resident edits own rating', (select ocena = 3 from public.test_ratings
  where test_id = '00000000-0000-4000-8000-0000000000a1');
insert into results select 'resident cannot read notifications of the author',
  (select count(*) = 0 from public.notifications where typ = 'test_ocena');

-- ---------- as a second resident ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e4","role":"authenticated"}', true);
insert into results select 'resident does not see other people''s sign-ups', (select count(*) = 0 from public.test_signups);
insert into results select 'resident does not see other people''s ratings', (select count(*) = 0 from public.test_ratings);
do $$ begin
  insert into public.test_signups (test_id) values ('00000000-0000-4000-8000-0000000000a1');
  insert into results values ('no sign-up above the seat limit', false);
exception when sqlstate 'HM409' then insert into results values ('no sign-up above the seat limit', true);
end $$;

-- ---------- as the idea author ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
insert into results select 'author reads ratings of own test', (select count(*) = 1 from public.test_ratings
  where test_id = '00000000-0000-4000-8000-0000000000a1' and co_poprawic = 'Większe litery');
insert into results select 'author does not read ratings of an innovation test', (select count(*) = 0 from public.test_ratings
  where test_id = '00000000-0000-4000-8000-0000000000a2');
insert into results select 'author gets a notification with a link to the test', (select count(*) = 1 from public.notifications
  where typ = 'test_ocena' and link = '/my/tester#test-00000000-0000-4000-8000-0000000000a1');
insert into public.tests (idea_id, tytul, miejsce, liczba_miejsc)
  values ('00000000-0000-4000-8000-0000000000f1', 'Second test', 'klub seniora', 8);
insert into results select 'author plans a test of own idea', (select count(*) = 1 from public.tests where tytul = 'Second test');
do $$ begin
  insert into public.tests (idea_id, innowacja_id, tytul)
    values ('00000000-0000-4000-8000-0000000000f1', 'merkury', 'Both');
  insert into results values ('a test has exactly one subject', false);
exception when others then insert into results values ('a test has exactly one subject', true);
end $$;
do $$ begin
  insert into public.tests (idea_id, tytul, created_at)
    values ('00000000-0000-4000-8000-0000000000f1', 'Backdated', now() - interval '1 year');
  insert into results values ('author cannot set created_at', false);
exception when others then insert into results values ('author cannot set created_at', true);
end $$;

-- ---------- as ROPS ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}', true);
insert into public.tests (innowacja_id, tytul, miejsce) values ('merkury', 'ROPS test', 'online');
insert into results select 'ROPS adds an innovation test', (select count(*) = 1 from public.tests where tytul = 'ROPS test');
insert into results select 'ROPS reads ratings of an innovation test', (select count(*) = 1 from public.test_ratings
  where test_id = '00000000-0000-4000-8000-0000000000a2');
insert into results select 'ROPS gets a notification about an innovation test', (select count(*) = 1 from public.notifications
  where typ = 'test_ocena' and link = '/my/tester#test-00000000-0000-4000-8000-0000000000a2');
insert into results select 'helpers are not callable from the API',
  not has_function_privilege('authenticated', 'public.tester_notify_rating()', 'execute')
  and not has_function_privilege('authenticated', 'public.tester_check_signup()', 'execute');

reset role;
select * from results order by ok, test;
