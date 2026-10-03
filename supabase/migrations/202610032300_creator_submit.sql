-- Sending an idea to ROPS (P2, #35) and locking it while ROPS has it.
-- The author used to be able to write any column of their idea through the REST API, including
-- wyslany_at: that let them undo a ROPS decision or flood the ROPS queue. Now:
--   * authors write only the card fields (column privileges);
--   * wyslany_at is set only by public.wyslij_pomysl(), with the database clock and a row lock;
--   * the card and its canvas are read-only from sending until ROPS asks for changes ("do_poprawy").

-- ---------------------------------------------------------------------------
-- May the signed-in author edit (and send) their idea now? Never sent, or the latest review asks for
-- changes and is newer than the latest submission. False for anyone else's idea.
-- ---------------------------------------------------------------------------
create function public.idea_editable(p_idea_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select i.wyslany_at is null or exists (
      select 1
      from (
        select r.status, r.created_at
        from public.idea_reviews r
        where r.idea_id = i.id
        order by r.created_at desc
        limit 1
      ) latest
      where latest.status = 'do_poprawy' and latest.created_at >= i.wyslany_at
    )
    from public.ideas i
    where i.id = p_idea_id and i.autor_id = auth.uid()
  ), false)
$$;

-- ---------------------------------------------------------------------------
-- Column privileges: authors create and edit only the card fields. id, autor_id and the timestamps
-- come from defaults and triggers; wyslany_at only from wyslij_pomysl(); obszar_id is not author input.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.ideas from anon, authenticated;
grant insert (tytul, opis, istota, dla_kogo, etap) on public.ideas to authenticated;
grant update (tytul, opis, istota, dla_kogo, etap) on public.ideas to authenticated;

-- ---------------------------------------------------------------------------
-- Lock while ROPS has the idea. Migrations, the service key and security definer functions
-- (current_user = owner) are not limited.
-- ---------------------------------------------------------------------------
create function public.creator_lock_idea()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  if not public.idea_editable(old.id) then
    raise exception 'Pomysł jest w ROPS. Edycja wróci, jeśli ROPS poprosi o poprawki.'
      using errcode = 'HM423';
  end if;
  return new;
end;
$$;

-- Runs before ideas_touch (triggers fire in name order)
create trigger ideas_lock before update on public.ideas
  for each row execute function public.creator_lock_idea();

create function public.creator_lock_canvas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return coalesce(new, old);
  end if;
  -- Both ends of an UPDATE count: moving answers out of a locked idea changes it too
  if (tg_op in ('UPDATE', 'DELETE') and not public.idea_editable(old.idea_id))
     or (tg_op in ('INSERT', 'UPDATE') and not public.idea_editable(new.idea_id)) then
    raise exception 'Pomysł jest w ROPS. Edycja wróci, jeśli ROPS poprosi o poprawki.'
      using errcode = 'HM423';
  end if;
  return coalesce(new, old);
end;
$$;

-- Runs before idea_canvas_touch
create trigger idea_canvas_lock before insert or update or delete on public.idea_canvas
  for each row execute function public.creator_lock_canvas();

-- The canvas touch trigger bumps ideas.updated_at, a column authors may no longer write directly
alter function public.creator_touch_canvas() security definer;

-- ---------------------------------------------------------------------------
-- "Wyślij do ROPS": the only way to set wyslany_at. Locks the row, so parallel calls send once.
-- Returns 'wyslany' (first time) or 'ponownie' (corrected version after "do_poprawy").
-- Errors: HM404 not the author's idea, HM409 already with ROPS, HM422 card incomplete.
-- ---------------------------------------------------------------------------
create function public.wyslij_pomysl(p_idea_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Wymagane logowanie' using errcode = '28000';
  end if;

  select * into v_idea from public.ideas
  where id = p_idea_id and autor_id = auth.uid()
  for no key update; -- serialises sends without blocking ROPS from adding a review
  if not found then
    raise exception 'Nie ma takiego pomysłu' using errcode = 'HM404';
  end if;

  if not public.idea_editable(p_idea_id) then
    raise exception 'Pomysł jest już w ROPS' using errcode = 'HM409';
  end if;

  if coalesce(btrim(v_idea.tytul), '') = '' or coalesce(btrim(v_idea.opis), '') = ''
     or coalesce(btrim(v_idea.istota), '') = '' or coalesce(btrim(v_idea.dla_kogo), '') = '' then
    raise exception 'Uzupełnij fiszkę przed wysłaniem' using errcode = 'HM422';
  end if;

  update public.ideas set wyslany_at = now() where id = p_idea_id;
  return case when v_idea.wyslany_at is null then 'wyslany' else 'ponownie' end;
end;
$$;

revoke execute on function public.creator_lock_idea() from public, anon, authenticated;
revoke execute on function public.creator_lock_canvas() from public, anon, authenticated;
revoke execute on function public.wyslij_pomysl(uuid) from public, anon;
revoke execute on function public.idea_editable(uuid) from public, anon;
grant execute on function public.wyslij_pomysl(uuid) to authenticated;
grant execute on function public.idea_editable(uuid) to authenticated;
