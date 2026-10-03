-- Calls for proposals ("nabory", P4, module VI, #10). ROPS adds them, switches them on and off and
-- moves deadlines; the application generator (P3, #18) reads the published ones.
-- The id is a text slug, so the demo ids already used by P3 (e.g. nabor-demo-seniorzy-2026) stay valid.

create table public.calls (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  nazwa text not null check (char_length(nazwa) between 3 and 200),
  organizator text not null default 'Regionalny Ośrodek Polityki Społecznej w Krakowie'
    check (char_length(organizator) <= 200),
  cel text check (char_length(cel) <= 1000),                  -- what the call funds, plain Polish
  url text check (url is null or url ~ '^https?://'),
  termin_od date,
  termin_do date,
  obszary text[] not null default '{}',                       -- challenge_areas.id
  opublikowany boolean not null default false,                -- "włączanie naborów"
  demo boolean not null default false,                        -- fictional, shown as "Dane demonstracyjne"
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (termin_od is null or termin_do is null or termin_od <= termin_do)
);

create index calls_published_idx on public.calls (opublikowany, termin_do);

alter table public.calls enable row level security;

create policy "nabory: odczyt opublikowanych" on public.calls
  for select to anon, authenticated using (opublikowany or public.is_rops());
create policy "nabory: dodawanie przez ROPS" on public.calls
  for insert to authenticated with check (public.is_rops());
create policy "nabory: edycja przez ROPS" on public.calls
  for update to authenticated using (public.is_rops()) with check (public.is_rops());
create policy "nabory: usuwanie przez ROPS" on public.calls
  for delete to authenticated using (public.is_rops());

create function public.calls_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger calls_touch before update on public.calls
  for each row execute function public.calls_touch();

revoke execute on function public.calls_touch() from public, anon, authenticated;

-- Authors of sent ideas in the given challenge areas, for "the deadline changed" notices.
-- Only ROPS may call it; returns ids and e-mails (e-mail is used server-side only).
create function public.call_matching_authors(p_obszary text[])
returns table (user_id uuid, email text, tytul text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (i.autor_id) i.autor_id, u.email, i.tytul
  from public.ideas i
  join auth.users u on u.id = i.autor_id
  where public.is_rops()
    and i.wyslany_at is not null
    and i.obszar_id = any (coalesce(p_obszary, '{}'))
  order by i.autor_id, i.wyslany_at desc
$$;

revoke execute on function public.call_matching_authors(text[]) from public, anon;
grant execute on function public.call_matching_authors(text[]) to authenticated;
