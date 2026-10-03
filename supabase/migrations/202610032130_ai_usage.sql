-- Daily AI limit per signed-in user (P3, #20). The per-IP hourly limit stays in memory
-- (lib/ai/rate-limit.ts); this one is in the database, so it holds across Vercel instances.
--
-- One row per user and day (Polish time) with the number of AI requests. Nobody writes the table
-- directly: ai_usage_take() counts a request for auth.uid() and refuses it above the limit.
-- Only counts are stored, never the text of a request.

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- A user may see their own counts (e.g. "zostało Ci 40 zapytań na dziś"); ROPS admins see all.
create policy "ai_usage: owner reads" on public.ai_usage
  for select using (user_id = auth.uid());
create policy "ai_usage: ROPS admin reads" on public.ai_usage
  for select using (public.moja_rola() = 'rops_admin');
-- No insert/update/delete policies: writes go only through ai_usage_take().

-- Counts one AI request for the caller. Returns the requests left today after this one,
-- or -1 when the limit is reached (the request is then not counted). Anonymous callers are not
-- counted here (they have the per-IP limit) and get p_limit back.
create or replace function public.ai_usage_take(p_limit integer)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/Warsaw')::date;
  used integer;
begin
  if p_limit is null or p_limit < 1 then
    raise exception 'p_limit must be positive';
  end if;
  if uid is null then
    return p_limit;
  end if;

  insert into public.ai_usage as u (user_id, day, requests)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set requests = u.requests + 1
    where u.requests < p_limit
  returning requests into used;

  if used is null then
    return -1; -- the row exists and is at the limit
  end if;
  return p_limit - used;
end;
$$;

revoke all on function public.ai_usage_take(integer) from public;
grant execute on function public.ai_usage_take(integer) to authenticated;
