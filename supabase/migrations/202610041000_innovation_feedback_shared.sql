-- Innovation tester, part "ocena istniejących rozwiązań" (P4): anyone signed in can rate any
-- innovation from the Library (not only the ones ROPS runs a test for) and propose an improvement.
-- Texts are visible to the author and ROPS; the public sees only the average and the count.

create table public.innovation_reviews (
  id uuid primary key default gen_random_uuid(),
  innowacja_id text not null references public.innovations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  ocena int not null check (ocena between 1 and 5),
  co_dzialalo text check (char_length(co_dzialalo) <= 2000),
  co_poprawic text check (char_length(co_poprawic) <= 2000),   -- "propozycja usprawnienia"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (innowacja_id, user_id)
);

create index innovation_reviews_innovation_idx on public.innovation_reviews (innowacja_id, created_at desc);

alter table public.innovation_reviews enable row level security;

create policy "opinie o rozwiązaniach: odczyt własnych" on public.innovation_reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "opinie o rozwiązaniach: odczyt przez ROPS" on public.innovation_reviews
  for select to authenticated using (public.is_rops());
create policy "opinie o rozwiązaniach: dodawanie własnej" on public.innovation_reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "opinie o rozwiązaniach: edycja własnej" on public.innovation_reviews
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "opinie o rozwiązaniach: usuwanie własnej" on public.innovation_reviews
  for delete to authenticated using (user_id = (select auth.uid()));

revoke update on public.innovation_reviews from authenticated;
grant update (ocena, co_dzialalo, co_poprawic) on public.innovation_reviews to authenticated;

create function public.innovation_reviews_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger innovation_reviews_touch before update on public.innovation_reviews
  for each row execute function public.innovation_reviews_touch();

-- A new improvement proposal lands in the ROPS bell (it has no other recipient).
create function public.innovation_reviews_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(new.co_poprawic), '') <> ''
     and (tg_op = 'INSERT' or coalesce(old.co_poprawic, '') is distinct from new.co_poprawic) then
    insert into public.notifications (user_id, typ, tytul, link)
    select p.id, 'propozycja_usprawnienia',
      left(format('Propozycja usprawnienia: „%s”', i.nazwa), 200),
      '/admin/tests?innovation=' || new.innowacja_id
    from public.profiles p
    join public.innovations i on i.id = new.innowacja_id
    where p.role in ('rops_redaktor', 'rops_admin') and p.id <> new.user_id;
  end if;
  return new;
end;
$$;

create trigger innovation_reviews_notify after insert or update on public.innovation_reviews
  for each row execute function public.innovation_reviews_notify();

-- Public numbers for a Library card: reviews plus ratings from tests of this innovation.
-- Aggregates only, never texts or people.
create function public.innovation_feedback_summary(p_innowacja_id text)
returns table (srednia numeric, ocen integer)
language sql
stable
security definer
set search_path = ''
as $$
  with all_ratings as (
    select r.ocena from public.innovation_reviews r where r.innowacja_id = p_innowacja_id
    union all
    select tr.ocena from public.test_ratings tr
    join public.tests t on t.id = tr.test_id
    where t.innowacja_id = p_innowacja_id
  )
  select round(avg(ocena)::numeric, 1), count(*)::integer from all_ratings
$$;

revoke execute on function public.innovation_reviews_touch() from public, anon, authenticated;
revoke execute on function public.innovation_reviews_notify() from public, anon, authenticated;
grant execute on function public.innovation_feedback_summary(text) to anon, authenticated;
