-- Idea reviews by ROPS (P4, module VI, #5). Every decision is a new row, so the history stays;
-- the current status of an idea is its latest review (view public.idea_status). No review = "nowy".

create table public.idea_reviews (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  status text not null check (status in ('w_weryfikacji', 'zatwierdzony', 'do_poprawy', 'odrzucony')),
  komentarz text check (char_length(komentarz) <= 2000), -- shown to the author
  reviewer_id uuid not null default auth.uid() references public.profiles (id) on delete set null,
  ekspert_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idea_reviews_idea_idx on public.idea_reviews (idea_id, created_at desc);
create index idea_reviews_ekspert_idx on public.idea_reviews (ekspert_id);

alter table public.idea_reviews enable row level security;

-- ROPS reads and writes all reviews; the reviewer is always the signed-in user.
create policy "oceny pomysłów: odczyt przez ROPS" on public.idea_reviews
  for select to authenticated using (public.is_rops());
create policy "oceny pomysłów: dodawanie przez ROPS" on public.idea_reviews
  for insert to authenticated
  with check (public.is_rops() and reviewer_id = (select auth.uid()));

-- The author sees the reviews of their own ideas; an expert sees reviews where they are assigned.
create policy "oceny pomysłów: odczyt przez autora" on public.idea_reviews
  for select to authenticated using (
    exists (select 1 from public.ideas i where i.id = idea_id and i.autor_id = (select auth.uid()))
  );
create policy "oceny pomysłów: odczyt przez przypisanego eksperta" on public.idea_reviews
  for select to authenticated using (ekspert_id = (select auth.uid()));

-- Reviews are never edited or deleted (audit trail): no update/delete policies.

-- Latest review per idea. security_invoker: RLS of idea_reviews applies to whoever reads the view,
-- so an author sees the status of their own ideas only (P2 reads it in "Moje pomysły").
create view public.idea_status with (security_invoker = true) as
select distinct on (r.idea_id)
  r.idea_id,
  r.status,
  r.komentarz,
  r.ekspert_id,
  r.created_at as oceniony_at
from public.idea_reviews r
order by r.idea_id, r.created_at desc;

grant select on public.idea_status to authenticated;

-- E-mail of an idea's author, for the "your idea was reviewed" e-mail. Only for ROPS.
-- security definer: reads auth.users, which the API cannot see.
create function public.idea_author_email(p_idea_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.ideas i
  join auth.users u on u.id = i.autor_id
  where i.id = p_idea_id and public.is_rops()
$$;

revoke execute on function public.idea_author_email(uuid) from public, anon;
grant execute on function public.idea_author_email(uuid) to authenticated;
