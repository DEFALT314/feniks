-- Permission tests for idea_reviews (P4, #5). Run inside a rolled-back transaction:
--   (echo "begin;"; cat supabase/tests/idea_reviews_rls.sql; echo "rollback;") > /tmp/t.sql \
--     && pnpm exec supabase db query --linked -f /tmp/t.sql
-- Every row must have ok = true.

create temp table results (test text, ok boolean);
grant all on results to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000b1', 'test-author@example.org'),
  ('00000000-0000-4000-8000-0000000000b2', 'test-other@example.org'),
  ('00000000-0000-4000-8000-0000000000b3', 'test-rops@example.org'),
  ('00000000-0000-4000-8000-0000000000b4', 'test-expert@example.org');
update public.profiles set role = 'rops_redaktor' where id = '00000000-0000-4000-8000-0000000000b3';
update public.profiles set role = 'ekspert' where id = '00000000-0000-4000-8000-0000000000b4';
insert into public.ideas (id, autor_id, tytul, wyslany_at) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Test idea', now());

-- ---------- as ROPS ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b3","role":"authenticated"}', true);
insert into public.idea_reviews (idea_id, status, komentarz, ekspert_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'do_poprawy', 'Dopisz koszty', '00000000-0000-4000-8000-0000000000b4');
insert into results select 'ROPS adds a review as themselves',
  (select reviewer_id = '00000000-0000-4000-8000-0000000000b3' from public.idea_reviews limit 1);
insert into results select 'ROPS reads the author e-mail',
  public.idea_author_email('00000000-0000-4000-8000-0000000000c1') = 'test-author@example.org';
do $$ begin
  insert into public.idea_reviews (idea_id, status, reviewer_id)
    values ('00000000-0000-4000-8000-0000000000c1', 'zatwierdzony', '00000000-0000-4000-8000-0000000000b2');
  insert into results values ('ROPS cannot spoof the reviewer', false);
exception when others then insert into results values ('ROPS cannot spoof the reviewer', true);
end $$;
update public.idea_reviews set status = 'zatwierdzony';
insert into results select 'reviews cannot be edited', (select bool_and(status = 'do_poprawy') from public.idea_reviews);

-- ---------- as the author ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
insert into results select 'author sees the status of own idea',
  (select status = 'do_poprawy' and komentarz = 'Dopisz koszty' from public.idea_status
   where idea_id = '00000000-0000-4000-8000-0000000000c1');
insert into results select 'author cannot read the author e-mail function', public.idea_author_email('00000000-0000-4000-8000-0000000000c1') is null;
do $$ begin
  insert into public.idea_reviews (idea_id, status) values ('00000000-0000-4000-8000-0000000000c1', 'zatwierdzony');
  insert into results values ('author cannot approve own idea', false);
exception when others then insert into results values ('author cannot approve own idea', true);
end $$;

-- ---------- as another user ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
insert into results select 'other user sees no reviews', (select count(*) from public.idea_reviews) = 0;
insert into results select 'other user sees no status', (select count(*) from public.idea_status) = 0;

-- ---------- as the assigned expert ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b4","role":"authenticated"}', true);
insert into results select 'assigned expert sees the review', (select count(*) from public.idea_reviews) = 1;

-- ---------- as anonymous ----------
reset role; set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  perform count(*) from public.idea_reviews;
  insert into results values ('anon cannot read reviews', (select count(*) from public.idea_reviews) = 0);
exception when others then insert into results values ('anon cannot read reviews', true);
end $$;

reset role;
select test, ok from results;
