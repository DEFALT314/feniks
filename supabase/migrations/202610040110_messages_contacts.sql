-- Module V: mentor support and cross-sector partnerships (audit before the demo).
-- 1. Anyone signed in may start a conversation with an expert (mentor), an organisation (NGO) or a
--    municipality (JST), not only with ROPS. ROPS still sees every thread (moderation, dialogue).
-- 2. ROPS may invite an expert or a partner into an existing conversation.
-- 3. A new message notifies everyone else in the thread (and ROPS) from the database, because a
--    regular user may not notify other users through dodaj_powiadomienie().
-- Tables are unchanged: RLS from 202610032230_messages_shared.sql still applies.

-- Who can be contacted: experts and organisations, with their public display name and role.
-- Residents never appear here (private people). ROPS is always in every thread anyway.
create function public.contact_directory()
returns table (id uuid, nazwa text, rola text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(p.nazwa_wyswietlana, 'Bez nazwy'), p.role
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.role in ('ekspert', 'ngo', 'jst')
  order by case p.role when 'ekspert' then 0 when 'ngo' then 1 else 2 end, p.nazwa_wyswietlana
$$;

-- Same as before, except that a regular user may add experts, NGOs and municipalities.
create or replace function public.start_thread(
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
  if not public.is_rops() and exists (
    select 1 from unnest(coalesce(p_uczestnicy, '{}')) u
    where not exists (
      select 1 from public.profiles p
      where p.id = u and p.id <> auth.uid() and p.role in ('ekspert', 'ngo', 'jst')
    )
  ) then
    raise exception 'Do rozmowy możesz dodać tylko eksperta, organizację albo gminę';
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

-- ROPS invites an expert or a partner into a conversation ("Zaproś eksperta").
create function public.invite_to_thread(p_thread_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_rops() then
    raise exception 'Tylko ROPS może zapraszać do rozmowy';
  end if;
  if not exists (select 1 from public.threads where id = p_thread_id) then
    raise exception 'Nie znaleziono rozmowy';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_user_id and role in ('ekspert', 'ngo', 'jst')
  ) then
    raise exception 'Zaprosić można eksperta, organizację albo gminę';
  end if;
  perform public.thread_add_participant(p_thread_id, p_user_id);
end;
$$;

-- "New message" notification for the other participants and, when the writer is not ROPS, for all
-- ROPS staff. Only someone who can see the thread may call it. Returns the number of notifications.
create function public.notify_thread(p_thread_id uuid, p_tytul text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_link text := '/my/messages?thread=' || p_thread_id::text;
begin
  if not public.can_see_thread(p_thread_id) then
    raise exception 'Brak dostępu do tej rozmowy';
  end if;
  insert into public.notifications (user_id, typ, tytul, link)
  select r.id, 'wiadomosc', left(p_tytul, 200), v_link
  from (
    select tp.user_id as id from public.thread_participants tp
    where tp.thread_id = p_thread_id
    union
    select p.id from public.profiles p
    where not public.is_rops() and p.role in ('rops_redaktor', 'rops_admin')
  ) r
  where r.id <> auth.uid();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.contact_directory() from public, anon;
revoke execute on function public.invite_to_thread(uuid, uuid) from public, anon;
revoke execute on function public.notify_thread(uuid, text) from public, anon;
grant execute on function public.contact_directory() to authenticated;
grant execute on function public.invite_to_thread(uuid, uuid) to authenticated;
grant execute on function public.notify_thread(uuid, text) to authenticated;
