-- Cache of AI responses (P3, lib/ai/cache.ts).
--
-- Keys are HMAC-SHA256 of the request computed with a server-only secret. The table has RLS on and
-- deliberately NO policies: nobody reads or writes it directly with the public key. Access goes
-- only through the two functions below:
--   ai_cache_get(key)  returns one entry by its exact key (keys can't be guessed, so no listing),
--   ai_cache_put(key, value)  stores an entry; without the server secret nobody can compute the key
--   of a real request, so a fake answer can't be planted for it.
-- Entries hold model output for redacted input (no personal data, CLAUDE.md rule 5) and expire after 30 days.

create table public.ai_cache (
  key text primary key check (key ~ '^[0-9a-f]{64}$'),
  value jsonb not null check (octet_length(value::text) <= 100000),
  created_at timestamptz not null default now()
);

alter table public.ai_cache enable row level security;
-- No policies on purpose (see above).

create index ai_cache_created_at on public.ai_cache (created_at);

create or replace function public.ai_cache_get(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select value from public.ai_cache
  where key = p_key and created_at > now() - interval '30 days';
$$;

create or replace function public.ai_cache_put(p_key text, p_value jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_cache (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, created_at = now();
$$;

revoke all on function public.ai_cache_get(text) from public;
revoke all on function public.ai_cache_put(text, jsonb) from public;
grant execute on function public.ai_cache_get(text) to anon, authenticated;
grant execute on function public.ai_cache_put(text, jsonb) to anon, authenticated;
