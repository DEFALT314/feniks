-- AI and matchmaking tables (P3): catalog vectors, matchmaking statistics, Middleman service cards.
-- Needs public.moja_rola() (P4, *_wspolne.sql) and the knowledge base tables (202610031800_zasobnik_tabele.sql).

create extension if not exists vector with schema extensions;

-- Vectors of the catalog: several chunks per innovation (full description, problem, audience,
-- keywords, plain-language problem statements), one per challenge area and per challenge.
-- Model sdadas/mmlw-e5-base, 768 dims, unit length. Filled by scripts/embed.py (service key).
create table public.embeddings (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('innovation', 'area', 'challenge')),
  ref_id text not null,           -- innovations.id, challenge_areas.id or challenges.id
  chunk smallint not null,
  chunk_type text not null,       -- full | problem | summary | audience | keywords | plain | area | challenge
  content text not null,          -- the embedded text (public catalog data)
  embedding extensions.vector(768) not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (kind, ref_id, chunk)
);

create index embeddings_hnsw on public.embeddings
  using hnsw (embedding extensions.vector_cosine_ops);
create index embeddings_ref on public.embeddings (kind, ref_id);

-- Best-matching items of one kind: an item scores by its best chunk.
-- Runs with the caller's rights (security invoker), so RLS hides unpublished innovations.
create or replace function public.match_embeddings(
  query extensions.vector(768),
  match_kind text,
  match_count int default 20
)
returns table (ref_id text, similarity float)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select e.ref_id, max(1 - (e.embedding <=> query)) as similarity
  from public.embeddings e
  where e.kind = match_kind
    and (
      match_kind <> 'innovation'
      or exists (select 1 from public.innovations i where i.id = e.ref_id and i.do_matchmakingu)
    )
  group by e.ref_id
  order by similarity desc
  limit least(match_count, 50);
$$;

-- Matchmaking statistics for trends (#9). The description is NOT stored: the /dopasuj page
-- promises that only the area and the challenge are kept.
create table public.match_queries (
  id bigint generated always as identity primary key,
  area_id text references public.challenge_areas (id) on delete set null,
  challenge_id text references public.challenges (id) on delete set null,
  match_quality text not null check (match_quality in ('strong', 'weak')), -- weak = possible gap in the Library
  created_at timestamptz not null default now()
);

create index match_queries_created_at on public.match_queries (created_at);

-- Middleman: service cards drafted for an institution (lib/contracts/middleman.ts).
create table public.middleman_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  innovation_id text not null references public.innovations (id),
  institution jsonb not null,     -- InstitutionProfile
  card jsonb not null,            -- title, for_whom, how_it_works, who_delivers, cost, risks, first_steps
  version int not null default 1 check (version >= 1),
  status text not null default 'szkic' check (status in ('szkic', 'wyslana_do_rops')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index middleman_cards_owner on public.middleman_cards (owner_id);

create or replace function public.middleman_cards_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger middleman_cards_updated_at before update on public.middleman_cards
  for each row execute function public.middleman_cards_set_updated_at();

-- RLS
alter table public.embeddings enable row level security;
alter table public.match_queries enable row level security;
alter table public.middleman_cards enable row level security;

-- Vectors are derived from public catalog data: everyone may read them; only scripts write (service key).
create policy "embeddings: read for everyone" on public.embeddings
  for select to anon, authenticated using (true);

-- Anyone using /dopasuj adds one statistics row; only ROPS reads them.
create policy "match_queries: insert for everyone" on public.match_queries
  for insert to anon, authenticated with check (true);
create policy "match_queries: read for ROPS" on public.match_queries
  for select to authenticated
  using (public.moja_rola() in ('rops_redaktor', 'rops_admin'));

-- Cards belong to their author; ROPS sees the ones sent for consultation.
create policy "middleman_cards: owner reads" on public.middleman_cards
  for select to authenticated using (owner_id = auth.uid());
create policy "middleman_cards: owner creates" on public.middleman_cards
  for insert to authenticated with check (owner_id = auth.uid());
create policy "middleman_cards: owner edits" on public.middleman_cards
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "middleman_cards: ROPS reads sent cards" on public.middleman_cards
  for select to authenticated
  using (status = 'wyslana_do_rops' and public.moja_rola() in ('rops_redaktor', 'rops_admin'));
