-- Moduł II Zasobnik wiedzy (P1): Biblioteka innowacji, Mapa Wyzwań, persony, raporty i publikacje.
-- Źródło danych: data/rops/*.json, wypełnia supabase/seed.sql (scripts/seed/build_seed.ts).
-- Wymaga public.moja_rola() z migracji *_wspolne.sql (P4), dlatego znacznik czasu jest późniejszy.

-- Kategorie Biblioteki (9, np. dla-seniorow)
create table public.innovation_categories (
  id text primary key,
  nazwa text not null,
  url text,
  kolejnosc int not null default 0
);

create table public.innovations (
  id text primary key,                                  -- slug z pliku
  nazwa text not null,
  kategoria_id text not null references public.innovation_categories (id),
  etykieta text,                                        -- program: IWS, MIIS, MIWS, Inkubator Dostępności
  sprawdzona_przez_rops boolean not null default false, -- „wybrana do upowszechniania” (etykieta ≠ null w Bibliotece)
  opis_krotki text,
  problem text,
  dla_kogo text[] not null default '{}',
  kto_moze_wdrozyc text[] not null default '{}',
  czy_dziala text,
  autor_instytucja text,                                -- tylko instytucja; w UI ukryte do zgody ROPS
  materialy jsonb not null default '{}'::jsonb,         -- {opis_pdf, film, pakiet_zip, zasady_wykorzystania, inne[]}
  url text not null,                                    -- pełna karta w ROPS
  slowa_kluczowe text[] not null default '{}',
  przyklady_zapytan text[] not null default '{}',
  spoza_biblioteki boolean not null default false,      -- rekordy z biblioteka_spoza.json
  do_matchmakingu boolean not null default true,
  program text,
  zrodlo text,
  pewnosc text check (pewnosc in ('pewne', 'prawdopodobne')),
  opublikowana boolean not null default true,
  updated_at timestamptz not null default now()
);

create index innovations_kategoria_idx on public.innovations (kategoria_id);
create index innovations_slowa_idx on public.innovations using gin (slowa_kluczowe);
create index innovations_dla_kogo_idx on public.innovations using gin (dla_kogo);

-- Mapa Wyzwań Społecznych: 8 obszarów
create table public.challenge_areas (
  id text primary key,
  nr int not null,
  nazwa text not null,
  definicja text,
  dane text[] not null default '{}',
  slowa_kluczowe text[] not null default '{}',
  kategorie_biblioteki text[] not null default '{}',   -- id z innovation_categories
  strony text,
  zrodlo_url text
);

-- 48 kluczowych wyzwań (id unikalne w całej mapie)
create table public.challenges (
  id text primary key,
  obszar_id text not null references public.challenge_areas (id) on delete cascade,
  tekst text not null,
  kolejnosc int not null default 0
);

create index challenges_obszar_idx on public.challenges (obszar_id);

-- Fikcyjne persony ROPS, jedna na obszar
create table public.personas (
  id text primary key,
  obszar_id text not null references public.challenge_areas (id) on delete cascade,
  imie text not null,
  opis text,
  cele text[] not null default '{}',
  wyzwania text[] not null default '{}',
  motywacje text[] not null default '{}'
);

-- Raporty z badań ROPS i publikacje o innowacjach
create table public.resources (
  id text primary key,
  typ text not null check (typ in ('raport', 'publikacja')),
  rok int,
  tytul text not null,
  opis text,
  tagi text[] not null default '{}',
  moduly text[] not null default '{}',
  priorytet_dla_demo int,
  url text not null
);

create index resources_rok_idx on public.resources (rok);

-- RLS: odczyt dla wszystkich (także niezalogowanych), zapis tylko redakcja i administracja ROPS
alter table public.innovation_categories enable row level security;
alter table public.innovations enable row level security;
alter table public.challenge_areas enable row level security;
alter table public.challenges enable row level security;
alter table public.personas enable row level security;
alter table public.resources enable row level security;

create policy "kategorie: odczyt dla wszystkich" on public.innovation_categories
  for select to anon, authenticated using (true);
create policy "innowacje: odczyt opublikowanych" on public.innovations
  for select to anon, authenticated
  using (opublikowana or public.moja_rola() in ('rops_redaktor', 'rops_admin'));
create policy "obszary: odczyt dla wszystkich" on public.challenge_areas
  for select to anon, authenticated using (true);
create policy "wyzwania: odczyt dla wszystkich" on public.challenges
  for select to anon, authenticated using (true);
create policy "persony: odczyt dla wszystkich" on public.personas
  for select to anon, authenticated using (true);
create policy "zasoby: odczyt dla wszystkich" on public.resources
  for select to anon, authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array['innovation_categories', 'innovations', 'challenge_areas', 'challenges', 'personas', 'resources']
  loop
    execute format(
      'create policy "%1$s: zapis dla ROPS" on public.%1$I for all to authenticated
         using (public.moja_rola() in (''rops_redaktor'', ''rops_admin''))
         with check (public.moja_rola() in (''rops_redaktor'', ''rops_admin''))', t);
  end loop;
end $$;

-- updated_at przy edycji karty z panelu ROPS
create or replace function public.zasobnik_ustaw_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger innovations_updated_at before update on public.innovations
  for each row execute function public.zasobnik_ustaw_updated_at();
