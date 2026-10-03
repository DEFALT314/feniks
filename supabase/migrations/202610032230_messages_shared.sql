-- Messages between ROPS, idea authors and experts (P4, module V, #8).
-- Every thread includes ROPS: all ROPS staff can read and answer it. Other people see only the
-- threads they take part in. Threads and messages are written only through start_thread() and
-- post_message(), which decide who may add whom.

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  temat text not null check (char_length(temat) between 1 and 200),
  idea_id uuid unique references public.ideas (id) on delete cascade, -- one thread per idea
  innowacja_id text references public.innovations (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index threads_last_message_idx on public.threads (last_message_at desc);

create table public.thread_participants (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  nazwa text,                                   -- display name when added (others can't read profiles)
  rola text not null,                           -- role when added
  last_read_at timestamptz not null default 'epoch',
  primary key (thread_id, user_id)
);

create index thread_participants_user_idx on public.thread_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  autor_id uuid references public.profiles (id) on delete set null,
  autor_nazwa text,                             -- snapshot, shown to everyone in the thread
  autor_rola text not null,
  tresc text not null check (char_length(tresc) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- Visibility helper (security definer: avoids recursive RLS between the three tables)
-- ---------------------------------------------------------------------------
create function public.can_see_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    public.is_rops()
    or exists (
      select 1 from public.thread_participants p
      where p.thread_id = p_thread_id and p.user_id = auth.uid()
    )
  )
$$;

alter table public.threads enable row level security;
alter table public.thread_participants enable row level security;
alter table public.messages enable row level security;

create policy "wątki: odczyt przez uczestników i ROPS" on public.threads
  for select to authenticated using (public.can_see_thread(id));
create policy "uczestnicy: odczyt przez uczestników i ROPS" on public.thread_participants
  for select to authenticated using (public.can_see_thread(thread_id));
create policy "wiadomości: odczyt przez uczestników i ROPS" on public.messages
  for select to authenticated using (public.can_see_thread(thread_id));
-- No insert/update/delete policies: writes go through the functions below.

-- ---------------------------------------------------------------------------
-- Writing
-- ---------------------------------------------------------------------------

-- Adds the caller (and, for ROPS, the given people) to a thread. Internal.
create function public.thread_add_participant(p_thread_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.thread_participants (thread_id, user_id, nazwa, rola)
  select p_thread_id, p.id, p.nazwa_wyswietlana, p.role from public.profiles p where p.id = p_user_id
  on conflict (thread_id, user_id) do nothing
$$;

-- Posts a message as the caller. Returns the message id.
create function public.post_message(p_thread_id uuid, p_tresc text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_profile record;
begin
  if not public.can_see_thread(p_thread_id) then
    raise exception 'Brak dostępu do tej rozmowy';
  end if;
  if char_length(coalesce(trim(p_tresc), '')) = 0 then
    raise exception 'Wiadomość nie może być pusta';
  end if;

  select nazwa_wyswietlana, role into v_profile from public.profiles where id = auth.uid();
  -- A ROPS member who answers joins the thread, so their name shows and read state is kept.
  perform public.thread_add_participant(p_thread_id, auth.uid());

  insert into public.messages (thread_id, autor_id, autor_nazwa, autor_rola, tresc)
  values (p_thread_id, auth.uid(), v_profile.nazwa_wyswietlana, v_profile.role, trim(p_tresc))
  returning id into v_id;

  update public.threads set last_message_at = now() where id = p_thread_id;
  update public.thread_participants set last_read_at = now()
    where thread_id = p_thread_id and user_id = auth.uid();
  return v_id;
end;
$$;

-- Starts a thread with ROPS (or reuses the idea's thread) and posts the first message.
-- Anyone signed in may write to ROPS. Only ROPS may add other people (p_uczestnicy).
-- For an idea: its author is always a participant; only the author, ROPS or an expert assigned
-- to the idea may write in its thread.
create function public.start_thread(
  p_temat text,
  p_tresc text,
  p_idea_id uuid default null,
  p_innowacja_id text default null,
  p_uczestnicy uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread uuid;
  v_author uuid;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Wymagane logowanie';
  end if;
  if coalesce(array_length(p_uczestnicy, 1), 0) > 0 and not public.is_rops() then
    raise exception 'Tylko ROPS może dodawać inne osoby do rozmowy';
  end if;

  if p_idea_id is not null then
    select autor_id into v_author from public.ideas where id = p_idea_id;
    if v_author is null then
      raise exception 'Nie znaleziono pomysłu';
    end if;
    if not (
      public.is_rops()
      or v_author = auth.uid()
      or exists (select 1 from public.idea_reviews r where r.idea_id = p_idea_id and r.ekspert_id = auth.uid())
    ) then
      raise exception 'Brak dostępu do tego pomysłu';
    end if;
    select id into v_thread from public.threads where idea_id = p_idea_id;
  end if;

  if v_thread is null then
    insert into public.threads (temat, idea_id, innowacja_id, created_by)
    values (left(trim(p_temat), 200), p_idea_id, p_innowacja_id, auth.uid())
    returning id into v_thread;
  end if;

  perform public.thread_add_participant(v_thread, auth.uid());
  if v_author is not null then
    perform public.thread_add_participant(v_thread, v_author);
  end if;
  foreach v_user in array coalesce(p_uczestnicy, '{}') loop
    perform public.thread_add_participant(v_thread, v_user);
  end loop;

  perform public.post_message(v_thread, p_tresc);
  return v_thread;
end;
$$;

-- Marks a thread as read for the caller (ROPS members join the thread on first read).
create function public.mark_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_see_thread(p_thread_id) then
    return;
  end if;
  perform public.thread_add_participant(p_thread_id, auth.uid());
  update public.thread_participants set last_read_at = now()
    where thread_id = p_thread_id and user_id = auth.uid();
end;
$$;

-- E-mail addresses for "you have a new message" e-mails: non-ROPS participants other than the
-- caller, and only when the caller is ROPS or an expert (an author never gets anyone's address).
create function public.thread_reply_emails(p_thread_id uuid)
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, u.email
  from public.thread_participants p
  join auth.users u on u.id = p.user_id
  where p.thread_id = p_thread_id
    and p.user_id <> auth.uid()
    and p.rola not in ('rops_redaktor', 'rops_admin')
    and public.can_see_thread(p_thread_id)
    and public.moja_rola() in ('rops_redaktor', 'rops_admin', 'ekspert')
$$;

revoke execute on function public.thread_add_participant(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_see_thread(uuid) from public, anon;
revoke execute on function public.post_message(uuid, text) from public, anon;
revoke execute on function public.start_thread(text, text, uuid, text, uuid[]) from public, anon;
revoke execute on function public.mark_thread_read(uuid) from public, anon;
revoke execute on function public.thread_reply_emails(uuid) from public, anon;
grant execute on function public.can_see_thread(uuid) to authenticated;
grant execute on function public.post_message(uuid, text) to authenticated;
grant execute on function public.start_thread(text, text, uuid, text, uuid[]) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.thread_reply_emails(uuid) to authenticated;

-- Live updates of open conversations; RLS limits the stream to visible threads.
alter publication supabase_realtime add table public.messages;
