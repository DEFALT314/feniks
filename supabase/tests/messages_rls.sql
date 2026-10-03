-- Permission tests for threads and messages (P4, #8). Run inside a rolled-back transaction:
--   (echo "begin;"; cat supabase/tests/messages_rls.sql; echo "rollback;") > /tmp/t.sql \
--     && pnpm exec supabase db query --linked -f /tmp/t.sql
-- Every row must have ok = true.

create temp table results (test text, ok boolean);
grant all on results to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000e1', 'm-author@example.org'),
  ('00000000-0000-4000-8000-0000000000e2', 'm-other@example.org'),
  ('00000000-0000-4000-8000-0000000000e3', 'm-rops@example.org'),
  ('00000000-0000-4000-8000-0000000000e4', 'm-expert@example.org'),
  ('00000000-0000-4000-8000-0000000000e5', 'm-expert2@example.org');
update public.profiles set nazwa_wyswietlana = 'Autorka' where id = '00000000-0000-4000-8000-0000000000e1';
update public.profiles set role = 'rops_redaktor', nazwa_wyswietlana = 'Redakcja' where id = '00000000-0000-4000-8000-0000000000e3';
update public.profiles set role = 'ekspert', nazwa_wyswietlana = 'Ewa' where id = '00000000-0000-4000-8000-0000000000e4';
update public.profiles set role = 'ekspert' where id = '00000000-0000-4000-8000-0000000000e5';
insert into public.ideas (id, autor_id, tytul, wyslany_at) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000e1', 'Idea M', now());

-- ---------- ROPS starts the idea thread with the expert ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}', true);
create temp table t_ids as select public.start_thread('Idea M', 'Prosimy dopisać koszty.',
  '00000000-0000-4000-8000-0000000000f1', null, array['00000000-0000-4000-8000-0000000000e4']::uuid[]) as thread_id;
grant all on t_ids to authenticated, anon;
insert into results select 'ROPS thread has author, expert and ROPS as participants',
  (select count(*) from public.thread_participants where thread_id = (select thread_id from t_ids)) = 3;
insert into results select 'message keeps the author name snapshot',
  (select autor_nazwa = 'Redakcja' and autor_rola = 'rops_redaktor' from public.messages limit 1);
insert into results select 'second start_thread for the same idea reuses the thread',
  public.start_thread('x', 'Druga wiadomość', '00000000-0000-4000-8000-0000000000f1') = (select thread_id from t_ids);

-- ---------- author ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
insert into results select 'author sees the thread and messages',
  (select count(*) from public.messages where thread_id = (select thread_id from t_ids)) = 2;
insert into results select 'author replies', public.post_message((select thread_id from t_ids), 'Uzupełnimy.') is not null;
do $$ begin
  perform public.start_thread('Spam', 'hej', null, null, array['00000000-0000-4000-8000-0000000000e2']::uuid[]);
  insert into results values ('author cannot add other people', false);
exception when others then insert into results values ('author cannot add other people', true);
end $$;
do $$ begin
  insert into public.messages (thread_id, autor_rola, tresc) values ((select thread_id from t_ids), 'rops_admin', 'fake');
  insert into results values ('direct insert into messages is blocked', false);
exception when others then insert into results values ('direct insert into messages is blocked', true);
end $$;
insert into results select 'author gets no e-mail addresses', (select count(*) from public.thread_reply_emails((select thread_id from t_ids))) = 0;
insert into results select 'author starts a plain thread with ROPS', public.start_thread('Pytanie o nabór', 'Kiedy nabór?') is not null;

-- ---------- someone else ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
insert into results select 'outsider sees no threads', (select count(*) from public.threads) = 0;
insert into results select 'outsider sees no messages', (select count(*) from public.messages) = 0;
do $$ begin
  perform public.post_message((select thread_id from t_ids), 'wpuść mnie');
  insert into results values ('outsider cannot post', false);
exception when others then insert into results values ('outsider cannot post', true);
end $$;
do $$ begin
  perform public.start_thread('x', 'y', '00000000-0000-4000-8000-0000000000f1');
  insert into results values ('outsider cannot write in an idea thread', false);
exception when others then insert into results values ('outsider cannot write in an idea thread', true);
end $$;

-- ---------- assigned expert vs another expert ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e4","role":"authenticated"}', true);
insert into results select 'assigned expert sees the idea thread only',
  (select count(*) from public.threads) = 1;
insert into results select 'expert gets the author e-mail',
  (select array_agg(email) from public.thread_reply_emails((select thread_id from t_ids))) = array['m-author@example.org'];
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e5","role":"authenticated"}', true);
insert into results select 'other expert sees nothing', (select count(*) from public.threads) = 0;

-- ---------- ROPS sees every thread ----------
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}', true);
insert into results select 'ROPS sees all threads', (select count(*) from public.threads) = 2;
select public.mark_thread_read((select thread_id from t_ids));
insert into results select 'mark_thread_read updates last_read_at',
  (select last_read_at > now() - interval '1 minute' from public.thread_participants
   where thread_id = (select thread_id from t_ids) and user_id = '00000000-0000-4000-8000-0000000000e3');

-- ---------- anonymous ----------
reset role; set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into results select 'anon sees no threads', (select count(*) from public.threads) = 0;

reset role;
select test, ok from results;
