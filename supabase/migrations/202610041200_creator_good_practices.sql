-- Good practices (P2, #104): module III also presents "dobre praktyki lub rozwiązania testowane
-- w mikroskali". An idea is shown to everyone when its author agreed and ROPS approved it and chose
-- to show it. Only the card fields are public: never the author, never the canvas answers.
--
--   * the author gives or withdraws consent with ustaw_zgode_publikacji(), at any time, also while
--     the idea is locked in ROPS (migration *_creator_submit.sql locks direct edits);
--   * ROPS shows or hides an approved idea with opublikuj_pomysl();
--   * withdrawing consent, or any ROPS decision other than approval, ends the publication at once;
--     showing it again is ROPS's choice, never automatic;
--   * anyone reads published practices with dobre_praktyki().

alter table public.ideas
  add column zgoda_publikacji_at timestamptz,  -- the author agreed to show the card publicly
  add column opublikowany_at timestamptz;      -- ROPS shows the idea as a good practice

-- Neither column is author input: the column grants from *_creator_submit.sql stay as they are,
-- so both are written only by the security definer functions below.

-- ---------------------------------------------------------------------------
-- The ROPS decision about the version ROPS has now: the latest review, unless the author sent a
-- corrected version after it (then there is no current decision). Internal, not callable by users:
-- it reads idea_reviews past RLS.
-- ---------------------------------------------------------------------------
create function public.idea_current_status(p_idea_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.status
  from public.idea_reviews r
  join public.ideas i on i.id = r.idea_id
  where r.idea_id = p_idea_id and i.wyslany_at is not null and r.created_at >= i.wyslany_at
  order by r.created_at desc
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- The author gives (true) or withdraws (false) consent. Returns 'zgoda', 'brak_zgody', or 'ukryty'
-- when the withdrawal took a published practice down (the app then tells ROPS).
-- Errors: 28000 not signed in, HM404 not the author's idea.
-- ---------------------------------------------------------------------------
create function public.ustaw_zgode_publikacji(p_idea_id uuid, p_zgoda boolean)
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
  for no key update;
  if not found then
    raise exception 'Nie ma takiego pomysłu' using errcode = 'HM404';
  end if;

  if p_zgoda then
    update public.ideas set zgoda_publikacji_at = coalesce(zgoda_publikacji_at, now())
    where id = p_idea_id;
    return 'zgoda';
  end if;

  update public.ideas set zgoda_publikacji_at = null, opublikowany_at = null where id = p_idea_id;
  return case when v_idea.opublikowany_at is not null then 'ukryty' else 'brak_zgody' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- ROPS shows (true) or hides (false) an idea as a good practice. Returns 'opublikowany', 'ukryty'
-- or 'bez_zmian'. Errors: HM403 not ROPS, HM404 no such sent idea, HM409 no author consent,
-- HM422 the current ROPS decision is not an approval.
-- ---------------------------------------------------------------------------
create function public.opublikuj_pomysl(p_idea_id uuid, p_publikuj boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
begin
  if not coalesce(public.is_rops(), false) then
    raise exception 'Tylko ROPS pokazuje dobre praktyki' using errcode = 'HM403';
  end if;

  select * into v_idea from public.ideas
  where id = p_idea_id and wyslany_at is not null
  for no key update;
  if not found then
    raise exception 'Nie ma takiego pomysłu' using errcode = 'HM404';
  end if;

  if not p_publikuj then
    if v_idea.opublikowany_at is null then
      return 'bez_zmian';
    end if;
    update public.ideas set opublikowany_at = null where id = p_idea_id;
    return 'ukryty';
  end if;

  if v_idea.zgoda_publikacji_at is null then
    raise exception 'Autor nie zgodził się na pokazanie pomysłu' using errcode = 'HM409';
  end if;
  if public.idea_current_status(p_idea_id) is distinct from 'zatwierdzony' then
    raise exception 'Najpierw zatwierdź pomysł' using errcode = 'HM422';
  end if;
  if v_idea.opublikowany_at is not null then
    return 'bez_zmian';
  end if;

  update public.ideas set opublikowany_at = now() where id = p_idea_id;
  return 'opublikowany';
end;
$$;

-- ---------------------------------------------------------------------------
-- A ROPS decision other than approval (do poprawy, odrzucony, przekazany ekspertowi) ends the
-- publication: the public card must match what ROPS approved.
-- ---------------------------------------------------------------------------
create function public.creator_unpublish_on_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'zatwierdzony' then
    update public.ideas set opublikowany_at = null
    where id = new.idea_id and opublikowany_at is not null;
  end if;
  return new;
end;
$$;

create trigger idea_reviews_unpublish after insert on public.idea_reviews
  for each row execute function public.creator_unpublish_on_review();

-- ---------------------------------------------------------------------------
-- Public read: published practices, newest first, or one by id. Card fields, the area name and
-- results of tests with residents (module IV): the number of ratings, and their average only from
-- three ratings up, so no single resident's score can be read off.
-- The conditions repeat what the functions above maintain, as a second line of defence.
-- ---------------------------------------------------------------------------
create function public.dobre_praktyki(p_id uuid default null)
returns table (
  id uuid,
  tytul text,
  opis text,
  istota text,
  dla_kogo text,
  etap text,
  obszar_id text,
  obszar_nazwa text,
  opublikowany_at timestamptz,
  liczba_ocen int,
  srednia_ocena numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id, i.tytul, i.opis, i.istota, i.dla_kogo, i.etap, i.obszar_id, a.nazwa, i.opublikowany_at,
    coalesce(r.liczba, 0)::int,
    case when r.liczba >= 3 then round(r.srednia, 1) end
  from public.ideas i
  left join public.challenge_areas a on a.id = i.obszar_id
  left join lateral (
    select count(*) as liczba, avg(tr.ocena) as srednia
    from public.tests t
    join public.test_ratings tr on tr.test_id = t.id
    where t.idea_id = i.id
  ) r on true
  where i.opublikowany_at is not null
    and i.zgoda_publikacji_at is not null
    and public.idea_current_status(i.id) = 'zatwierdzony'
    and (p_id is null or i.id = p_id)
  order by i.opublikowany_at desc
$$;

create index ideas_opublikowany_idx on public.ideas (opublikowany_at desc)
  where opublikowany_at is not null;

revoke execute on function public.idea_current_status(uuid) from public, anon, authenticated;
revoke execute on function public.creator_unpublish_on_review() from public, anon, authenticated;
revoke execute on function public.ustaw_zgode_publikacji(uuid, boolean) from public, anon;
revoke execute on function public.opublikuj_pomysl(uuid, boolean) from public, anon;
revoke execute on function public.dobre_praktyki(uuid) from public;
grant execute on function public.ustaw_zgode_publikacji(uuid, boolean) to authenticated;
grant execute on function public.opublikuj_pomysl(uuid, boolean) to authenticated;
grant execute on function public.dobre_praktyki(uuid) to anon, authenticated;
