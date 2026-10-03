-- Idea creator and innovation tester (P2, modules III and IV).
-- Column names follow the other modules (Polish, as in lib/contracts/admin.ts IdeaQueueItem).
-- An idea's review status lives in P4's idea_reviews table; no review yet = "nowy".

-- ---------------------------------------------------------------------------
-- Ideas: the card ("fiszka") of one idea. Visible to ROPS and experts once sent.
-- ---------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tytul text not null check (char_length(tytul) between 1 and 200),
  opis text check (char_length(opis) <= 3000),
  istota text check (char_length(istota) <= 500),
  dla_kogo text check (char_length(dla_kogo) <= 500),
  etap text check (etap in ('pomysl', 'prototyp', 'przetestowane', 'gotowe')),
  obszar_id text references public.challenge_areas (id) on delete set null,
  wyslany_at timestamptz,                       -- set when the author sends the idea to ROPS (#35)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ideas_autor_idx on public.ideas (autor_id, updated_at desc);
create index ideas_wyslany_idx on public.ideas (wyslany_at desc) where wyslany_at is not null;

-- ---------------------------------------------------------------------------
-- Canvas answers: one row per answered field of data/rops/canvas_innowacji.json, saved after each step.
-- ---------------------------------------------------------------------------
create table public.idea_canvas (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  pole_id text not null,                        -- field id from canvas_innowacji.json, e.g. "intensywnosc"
  odpowiedz jsonb not null,                     -- shape per field type: lib/contracts/idea-creator.ts
  updated_at timestamptz not null default now(),
  primary key (idea_id, pole_id)
);

-- ---------------------------------------------------------------------------
-- Tests of an idea with residents (module IV): sign-ups and ratings.
-- ---------------------------------------------------------------------------
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  tytul text not null check (char_length(tytul) between 1 and 200),
  opis text check (char_length(opis) <= 3000),
  miejsce text,                                 -- place or "online"
  termin timestamptz,
  liczba_miejsc int check (liczba_miejsc > 0),
  created_at timestamptz not null default now()
);

create index tests_idea_idx on public.tests (idea_id);

create table public.test_signups (
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (test_id, user_id)
);

create table public.test_ratings (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  ocena int not null check (ocena between 1 and 5),
  co_dzialalo text check (char_length(co_dzialalo) <= 2000),
  co_poprawic text check (char_length(co_poprawic) <= 2000),
  created_at timestamptz not null default now(),
  unique (test_id, user_id)
);

-- ---------------------------------------------------------------------------
-- updated_at and immutable author
-- ---------------------------------------------------------------------------
create function public.creator_touch_idea()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.autor_id is distinct from old.autor_id then
    raise exception 'Nie można zmienić autora pomysłu';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger ideas_touch before update on public.ideas
  for each row execute function public.creator_touch_idea();

create function public.creator_touch_canvas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  update public.ideas set updated_at = now() where id = new.idea_id;
  return new;
end;
$$;

create trigger idea_canvas_touch before insert or update on public.idea_canvas
  for each row execute function public.creator_touch_canvas();

-- ---------------------------------------------------------------------------
-- Helpers for policies (security definer: read ideas/tests bypassing RLS, so policies don't recurse)
-- ---------------------------------------------------------------------------
create function public.is_idea_author(p_idea_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ideas where id = p_idea_id and autor_id = auth.uid())
$$;

create function public.is_test_author(p_test_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tests t join public.ideas i on i.id = t.idea_id
    where t.id = p_test_id and i.autor_id = auth.uid()
  )
$$;

create function public.is_signed_up(p_test_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.test_signups where test_id = p_test_id and user_id = auth.uid())
$$;

-- ROPS and experts see ideas once they were sent to ROPS.
create function public.can_review_idea(p_idea_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.moja_rola() in ('rops_redaktor', 'rops_admin', 'ekspert'), false)
    and exists (select 1 from public.ideas where id = p_idea_id and wyslany_at is not null)
$$;

revoke execute on function public.creator_touch_idea() from public, anon, authenticated;
revoke execute on function public.creator_touch_canvas() from public, anon, authenticated;
grant execute on function public.is_idea_author(uuid) to authenticated;
grant execute on function public.is_test_author(uuid) to authenticated;
grant execute on function public.is_signed_up(uuid) to authenticated;
grant execute on function public.can_review_idea(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS and policies
-- ---------------------------------------------------------------------------
alter table public.ideas enable row level security;
alter table public.idea_canvas enable row level security;
alter table public.tests enable row level security;
alter table public.test_signups enable row level security;
alter table public.test_ratings enable row level security;

-- ideas: the author does everything with their own; ROPS and experts read sent ideas
create policy "pomysły: autor" on public.ideas
  for all to authenticated
  using (autor_id = (select auth.uid()))
  with check (autor_id = (select auth.uid()));
create policy "pomysły: odczyt wysłanych przez ROPS i ekspertów" on public.ideas
  for select to authenticated using (public.can_review_idea(id));

-- idea_canvas: same as the idea
create policy "kanwa: autor" on public.idea_canvas
  for all to authenticated
  using (public.is_idea_author(idea_id))
  with check (public.is_idea_author(idea_id));
create policy "kanwa: odczyt przez ROPS i ekspertów" on public.idea_canvas
  for select to authenticated using (public.can_review_idea(idea_id));

-- tests: everyone signed in sees tests (to sign up); the idea author manages them
create policy "testy: odczyt dla zalogowanych" on public.tests
  for select to authenticated using (true);
create policy "testy: autor pomysłu" on public.tests
  for all to authenticated
  using (public.is_idea_author(idea_id))
  with check (public.is_idea_author(idea_id));

-- test_signups: your own sign-up; the test author sees who signed up
create policy "zapisy: własne" on public.test_signups
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "zapisy: odczyt przez autora testu" on public.test_signups
  for select to authenticated using (public.is_test_author(test_id));

-- test_ratings: only people signed up for the test rate it; the author and ROPS read ratings
create policy "oceny: własne" on public.test_ratings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_signed_up(test_id));
create policy "oceny: odczyt przez autora testu" on public.test_ratings
  for select to authenticated using (public.is_test_author(test_id));
create policy "oceny: odczyt przez ROPS" on public.test_ratings
  for select to authenticated using (public.is_rops());
