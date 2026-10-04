-- Permission tests for innovation reviews (P4). Run inside a rolled-back transaction (pnpm db:test).
-- Every row must have ok = true.

create temp table results (test text, ok boolean);
grant all on results to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000f7', 'f-resident@example.org'),
  ('00000000-0000-4000-8000-0000000000f8', 'f-other@example.org'),
  ('00000000-0000-4000-8000-0000000000f9', 'f-rops@example.org');
update public.profiles set role = 'rops_redaktor' where id = '00000000-0000-4000-8000-0000000000f9';
create temp table inno as select id from public.innovations order by id limit 1;
grant select on inno to authenticated, anon;

-- ---------- resident ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f7","role":"authenticated"}', true);
insert into public.innovation_reviews (innowacja_id, ocena, co_dzialalo, co_poprawic)
  values ((select id from inno), 4, 'Prosta obsługa', 'Większa czcionka');
insert into results select 'resident rates an innovation', (select count(*) from public.innovation_reviews) = 1;
do $$ begin
  insert into public.innovation_reviews (innowacja_id, ocena) values ((select id from inno), 5);
  insert into results values ('only one review per person and innovation', false);
exception when others then insert into results values ('only one review per person and innovation', true);
end $$;
update public.innovation_reviews set ocena = 5 where user_id = '00000000-0000-4000-8000-0000000000f7';
insert into results select 'resident edits own review', (select ocena = 5 from public.innovation_reviews limit 1);
do $$ begin
  insert into public.innovation_reviews (innowacja_id, user_id, ocena)
    values ((select id from inno), '00000000-0000-4000-8000-0000000000f8', 1);
  insert into results values ('cannot review as someone else', false);
exception when others then insert into results values ('cannot review as someone else', true);
end $$;

-- ---------- another user ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f8","role":"authenticated"}', true);
insert into results select 'other user does not see the text',
  (select count(*) from public.innovation_reviews where user_id = '00000000-0000-4000-8000-0000000000f7') = 0;
update public.innovation_reviews set ocena = 1;  -- must change nothing (checked as ROPS below)

-- ---------- ROPS ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f9","role":"authenticated"}', true);
insert into results select 'other user could not change the review',
  (select ocena = 5 from public.innovation_reviews where user_id = '00000000-0000-4000-8000-0000000000f7');
insert into results select 'ROPS reads the improvement proposal',
  (select co_poprawic = 'Większa czcionka' from public.innovation_reviews
   where user_id = '00000000-0000-4000-8000-0000000000f7');
insert into results select 'ROPS got a notification for the proposal',
  exists (select 1 from public.notifications where user_id = '00000000-0000-4000-8000-0000000000f9'
          and typ = 'propozycja_usprawnienia');

-- ---------- anonymous: numbers only ----------
reset role; set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into results select 'anon sees no review rows', (select count(*) from public.innovation_reviews) = 0;
insert into results select 'anon sees the public average',
  (select ocen >= 1 and srednia is not null from public.innovation_feedback_summary((select id from inno)));

reset role;
select test, ok from results;
