-- Innovation tester (P2, #36): tests of Library innovations, seat limits and feedback to the author.
-- Until now a test could belong only to a user's idea (tests.idea_id not null). Module IV also asks
-- residents to rate existing solutions, so ROPS can now run tests of innovations from the Library.

-- ---------------------------------------------------------------------------
-- A test belongs to exactly one idea or one Library innovation. Cascade, not restrict: seed.sql
-- deletes and re-inserts every innovation, so re-seeding removes innovation tests (seed_demo.sql
-- puts the demo ones back and must run after seed.sql).
-- ---------------------------------------------------------------------------
alter table public.tests
  alter column idea_id drop not null,
  add column innowacja_id text references public.innovations (id) on delete cascade,
  add constraint tests_one_subject check (num_nonnulls(idea_id, innowacja_id) = 1);

create index tests_innowacja_idx on public.tests (innowacja_id) where innowacja_id is not null;

-- ROPS runs tests of innovations (and may correct any test); idea authors keep their own policy
create policy "testy: ROPS" on public.tests
  for all to authenticated
  using (public.is_rops())
  with check (public.is_rops());

-- Users write only the test fields; id and created_at come from defaults
revoke insert, update on public.tests from anon, authenticated;
grant insert (idea_id, innowacja_id, tytul, opis, miejsce, termin, liczba_miejsc)
  on public.tests to authenticated;
grant update (tytul, opis, miejsce, termin, liczba_miejsc) on public.tests to authenticated;

-- A sign-up is created or removed, never moved to another test (that would skip the seat check)
revoke update on public.test_signups from anon, authenticated;

-- ---------------------------------------------------------------------------
-- May the signed-in user manage this test and read its feedback? The idea author, or ROPS.
-- ---------------------------------------------------------------------------
create or replace function public.is_test_author(p_test_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tests t
    left join public.ideas i on i.id = t.idea_id
    where t.id = p_test_id and (i.autor_id = auth.uid() or public.is_rops())
  )
$$;

-- ---------------------------------------------------------------------------
-- Seats taken per test. Sign-ups of other people are hidden by RLS, so the list of tests reads the
-- counts here. Returns only numbers, never who signed up.
-- ---------------------------------------------------------------------------
create function public.test_seats_taken(p_test_ids uuid[])
returns table (test_id uuid, zajete integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.test_id, count(*)::integer
  from public.test_signups s
  where s.test_id = any (p_test_ids)
  group by s.test_id
$$;

-- ---------------------------------------------------------------------------
-- Sign-up guard: no sign-ups after the date of the test, none above the seat limit. The test row is
-- locked, so two people cannot take the last seat at the same time.
-- Errors: HM404 no such test, HM409 no free seats, HM410 sign-ups closed.
-- ---------------------------------------------------------------------------
create function public.tester_check_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test public.tests%rowtype;
  v_taken integer;
begin
  select * into v_test from public.tests where id = new.test_id for update;
  if not found then
    raise exception 'Nie ma takiego testu' using errcode = 'HM404';
  end if;
  if v_test.termin is not null and v_test.termin < now() then
    raise exception 'Zapisy na ten test są już zamknięte' using errcode = 'HM410';
  end if;
  if v_test.liczba_miejsc is not null then
    select count(*) into v_taken from public.test_signups where test_id = new.test_id;
    if v_taken >= v_test.liczba_miejsc then
      raise exception 'Brak wolnych miejsc' using errcode = 'HM409';
    end if;
  end if;
  return new;
end;
$$;

create trigger test_signups_check before insert on public.test_signups
  for each row execute function public.tester_check_signup();

-- ---------------------------------------------------------------------------
-- Feedback reaches the author: a new rating notifies the idea author (bell), or ROPS for a test of
-- a Library innovation. A regular user may not notify other users through dodaj_powiadomienie(),
-- so the database does it here. The notification never names the person who rated.
-- ---------------------------------------------------------------------------
create function public.tester_notify_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test public.tests%rowtype;
  v_title text;
  v_link text;
begin
  select * into v_test from public.tests where id = new.test_id;
  v_title := left(format('Nowa opinia z testu: „%s”', v_test.tytul), 200);
  v_link := format('/my/tester#test-%s', v_test.id);

  if v_test.idea_id is not null then
    insert into public.notifications (user_id, typ, tytul, link)
    select i.autor_id, 'test_ocena', v_title, v_link
    from public.ideas i
    where i.id = v_test.idea_id and i.autor_id <> new.user_id;
  else
    insert into public.notifications (user_id, typ, tytul, link)
    select p.id, 'test_ocena', v_title, v_link
    from public.profiles p
    where p.role in ('rops_redaktor', 'rops_admin') and p.id <> new.user_id;
  end if;
  return new;
end;
$$;

create trigger test_ratings_notify after insert on public.test_ratings
  for each row execute function public.tester_notify_rating();

revoke execute on function public.tester_check_signup() from public, anon, authenticated;
revoke execute on function public.tester_notify_rating() from public, anon, authenticated;
revoke execute on function public.test_seats_taken(uuid[]) from public, anon;
grant execute on function public.test_seats_taken(uuid[]) to authenticated;
