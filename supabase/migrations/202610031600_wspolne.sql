-- Shared platform tables (P4): profiles, institutions, notifications, audit log.
-- Timestamp earlier than module migrations: P1, P2 and P3 policies use public.moja_rola().

-- ---------------------------------------------------------------------------
-- Institutions (municipalities, OPS, PCPR, NGOs). Public read, verified by ROPS.
-- ---------------------------------------------------------------------------
create table public.instytucje (
  id uuid primary key default gen_random_uuid(),
  nazwa text not null,
  typ text not null check (typ in ('gmina', 'OPS', 'PCPR', 'NGO', 'inna')),
  teryt text,                                   -- TERYT code of the municipality or county
  zweryfikowana boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- User profiles: 1:1 with auth.users, created by a trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'mieszkaniec'
    check (role in ('mieszkaniec', 'ngo', 'jst', 'ekspert', 'rops_redaktor', 'rops_admin')),
  nazwa_wyswietlana text,
  instytucja_id uuid references public.instytucje (id) on delete set null,
  wnioskowana_rola text check (wnioskowana_rola in ('ngo', 'jst', 'ekspert')), -- role request to ROPS (module VI)
  zgoda_rodo_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_instytucja_idx on public.profiles (instytucja_id);

-- Role of the signed-in user (null when anonymous). Used in every RLS policy.
-- security definer: reads profiles bypassing RLS, so profiles policies don't recurse.
create function public.moja_rola()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_rops()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.moja_rola() in ('rops_redaktor', 'rops_admin'), false)
$$;

-- New user in auth.users → profile with role mieszkaniec.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nazwa_wyswietlana)
  values (new.id, nullif(new.raw_user_meta_data ->> 'nazwa_wyswietlana', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only rops_admin changes roles, only ROPS assigns institutions. Service key and migrations can do anything.
create function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Nie można zmienić identyfikatora profilu';
  end if;
  if new.role is distinct from old.role and public.moja_rola() is distinct from 'rops_admin' then
    raise exception 'Rolę może zmienić tylko administrator ROPS';
  end if;
  if new.instytucja_id is distinct from old.instytucja_id and not public.is_rops() then
    raise exception 'Instytucję może przypisać tylko ROPS';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Notifications (bell, Realtime). Inserted only through public.dodaj_powiadomienie().
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  typ text not null,                -- e.g. pomysl_wyslany, pomysl_oceniony, wiadomosc, nabor_termin
  tytul text not null,
  link text,                        -- in-app path, e.g. /moje/kreator/123
  przeczytane boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, przeczytane, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit log (module VI). Appended only through public.zapisz_audit(), cannot be edited.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  akcja text not null,              -- e.g. pomysl.ocena, profil.rola, innowacja.edycja
  obiekt text not null,             -- e.g. ideas:123, profiles:<uuid>
  szczegoly jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_obiekt_idx on public.audit_log (obiekt);

-- ---------------------------------------------------------------------------
-- RLS and policies
-- ---------------------------------------------------------------------------
alter table public.instytucje enable row level security;
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- instytucje: read for everyone; signed-in users may submit new (unverified) ones; everything else ROPS
create policy "instytucje: odczyt dla wszystkich" on public.instytucje
  for select to anon, authenticated using (true);
create policy "instytucje: zgłoszenie przez zalogowanego" on public.instytucje
  for insert to authenticated with check (not zweryfikowana or public.is_rops());
create policy "instytucje: edycja przez ROPS" on public.instytucje
  for update to authenticated using (public.is_rops()) with check (public.is_rops());
create policy "instytucje: usuwanie przez ROPS" on public.instytucje
  for delete to authenticated using (public.is_rops());

-- profiles: own profile, ROPS sees all; insert only via trigger, delete cascades from auth.users
create policy "profile: odczyt własnego" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profile: odczyt przez ROPS" on public.profiles
  for select to authenticated using (public.is_rops());
create policy "profile: edycja własnego" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profile: edycja przez ROPS" on public.profiles
  for update to authenticated using (public.is_rops()) with check (public.is_rops());

-- notifications: own only; marking as read
create policy "powiadomienia: odczyt własnych" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "powiadomienia: oznaczanie własnych" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "powiadomienia: usuwanie własnych" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

revoke update on public.notifications from authenticated;
grant update (przeczytane) on public.notifications to authenticated;

-- audit_log: read by ROPS only; written only through the function
create policy "dziennik: odczyt przez ROPS" on public.audit_log
  for select to authenticated using (public.is_rops());

-- ---------------------------------------------------------------------------
-- Functions for other modules (called from lib/notifications.ts and lib/audit.ts)
-- ---------------------------------------------------------------------------

-- Adds a notification for the given users or for everyone with the given roles.
-- A regular user may notify: themselves, ROPS and experts (e.g. idea submitted, reply in a thread).
-- ROPS and experts may notify anyone (e.g. idea review, message to the author).
create function public.dodaj_powiadomienie(
  p_typ text,
  p_tytul text,
  p_link text default null,
  p_user_ids uuid[] default null,
  p_role text[] default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rola text := public.moja_rola();
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Wymagane logowanie';
  end if;
  if coalesce(array_length(p_user_ids, 1), 0) = 0 and coalesce(array_length(p_role, 1), 0) = 0 then
    raise exception 'Podaj odbiorców: p_user_ids albo p_role';
  end if;

  with odbiorcy as (
    select p.id, p.role from public.profiles p
    where p.id = any (coalesce(p_user_ids, '{}'))
       or p.role = any (coalesce(p_role, '{}'))
  )
  insert into public.notifications (user_id, typ, tytul, link)
  select o.id, p_typ, p_tytul, p_link
  from odbiorcy o
  where v_rola in ('rops_redaktor', 'rops_admin', 'ekspert')
     or o.id = auth.uid()
     or o.role in ('rops_redaktor', 'rops_admin', 'ekspert');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Writes an audit entry; actor_id always comes from the session and cannot be spoofed.
create function public.zapisz_audit(
  p_akcja text,
  p_obiekt text,
  p_szczegoly jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Wymagane logowanie';
  end if;
  insert into public.audit_log (actor_id, akcja, obiekt, szczegoly)
  values (auth.uid(), p_akcja, p_obiekt, coalesce(p_szczegoly, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- Helper functions are not callable from the API; moja_rola and is_rops are needed in policies.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.dodaj_powiadomienie(text, text, text, uuid[], text[]) from public, anon;
revoke execute on function public.zapisz_audit(text, text, jsonb) from public, anon;
grant execute on function public.dodaj_powiadomienie(text, text, text, uuid[], text[]) to authenticated;
grant execute on function public.zapisz_audit(text, text, jsonb) to authenticated;
grant execute on function public.moja_rola() to anon, authenticated;
grant execute on function public.is_rops() to anon, authenticated;

-- Realtime for the bell (module V, #7); RLS limits it to the user's own notifications.
alter publication supabase_realtime add table public.notifications;
