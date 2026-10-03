-- Demo data (P4, #3): fictional institutions and the roles of the 5 "Wejdź jako…" accounts.
-- The auth users themselves are created on the first "Wejdź jako…" click (POST /api/demo/login,
-- lib/auth/demo-login.ts), which also restores this state. Run this file to reset the demo:
--   pnpm exec supabase db query --linked -f supabase/seed_demo.sql
-- Keep in sync with lib/auth/demo-accounts.ts.
begin;

insert into public.instytucje (id, nazwa, typ, zweryfikowana) values
  ('d0000000-0000-4000-8000-00000000000a', 'GOPS w Przykładowej Woli (fikcyjny)', 'OPS', true),
  ('d0000000-0000-4000-8000-00000000000b', 'Fundacja Dobry Start (fikcyjna)', 'NGO', true)
on conflict (id) do update set nazwa = excluded.nazwa, typ = excluded.typ, zweryfikowana = true;

update public.profiles p
set role = d.role,
    nazwa_wyswietlana = d.nazwa,
    instytucja_id = d.instytucja_id,
    wnioskowana_rola = null,
    zgoda_rodo_at = coalesce(p.zgoda_rodo_at, now())
from auth.users u
join (values
  ('demo.mieszkaniec@example.org', 'mieszkaniec', 'Stanisław', null::uuid),
  ('demo.gops@example.org', 'jst', 'GOPS w Przykładowej Woli', 'd0000000-0000-4000-8000-00000000000a'::uuid),
  ('demo.fundacja@example.org', 'ngo', 'Fundacja Dobry Start', 'd0000000-0000-4000-8000-00000000000b'::uuid),
  ('demo.ekspert@example.org', 'ekspert', 'Ewa', null::uuid),
  ('demo.rops@example.org', 'rops_admin', 'Redakcja ROPS', null::uuid)
) as d (email, role, nazwa, instytucja_id) on d.email = u.email
where p.id = u.id;

-- Demo accounts start with an empty notification bell.
delete from public.notifications n
using auth.users u
where n.user_id = u.id and u.email like 'demo.%@example.org';

-- Three sent ideas from design/makiety/Admin.dc.html, so the ROPS queue is not empty in the demo
-- (#5). Reset to the mockup state: one passed to the expert, one new, one sent back for changes.
delete from public.ideas where id in (
  'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003');

insert into public.ideas (id, autor_id, tytul, istota, opis, dla_kogo, etap, obszar_id, wyslany_at)
select d.id::uuid, u.id, d.tytul, d.istota, d.opis, d.dla_kogo, d.etap, d.obszar_id, now() - d.ago::interval
from (values
  ('d1000000-0000-4000-8000-000000000001', 'demo.fundacja@example.org', 'Sąsiedzki dyżur po wypisie',
   'Wolontariusze z sąsiedztwa odwiedzają seniorów przez dwa tygodnie po powrocie ze szpitala.',
   'Po wypisie ze szpitala senior często zostaje sam. Sąsiedzi-wolontariusze robią zakupy, przypominają o lekach i dają znać OPS, gdy dzieje się coś niepokojącego.',
   'samotni seniorzy po pobycie w szpitalu', 'pomysl', 'seniorzy', '30 minutes'),
  ('d1000000-0000-4000-8000-000000000002', 'demo.mieszkaniec@example.org', 'Kawiarenka cyfrowa w bibliotece',
   'Raz w tygodniu młodzież uczy seniorów obsługi telefonu i spraw urzędowych przez internet.',
   'Spotkania w gminnej bibliotece przy kawie: e-recepta, bankowość, rozmowa wideo z rodziną.',
   'seniorzy, którzy nie korzystają z internetu', 'pomysl', 'seniorzy', '2 hours'),
  ('d1000000-0000-4000-8000-000000000003', 'demo.fundacja@example.org', 'Mapa miejsc przyjaznych osobom w spektrum autyzmu',
   'Mapa sklepów, urzędów i przychodni z cichymi godzinami i przeszkolonym personelem.',
   null, 'osoby w spektrum autyzmu i ich rodziny', 'prototyp', 'niepelnosprawnosc', '1 day')
) as d (id, email, tytul, istota, opis, dla_kogo, etap, obszar_id, ago)
join auth.users u on u.email = d.email;

insert into public.idea_reviews (idea_id, status, komentarz, reviewer_id, ekspert_id, created_at)
select d.idea_id::uuid, d.status, d.komentarz, rops.id, ekspert.id, now() - d.ago::interval
from (values
  ('d1000000-0000-4000-8000-000000000001', 'w_weryfikacji', 'Przypisujemy mentorkę, odezwie się w wątku.', true, '10 minutes'),
  ('d1000000-0000-4000-8000-000000000003', 'do_poprawy', 'Prosimy dopisać, kto będzie sprawdzał miejsca na mapie.', false, '20 hours')
) as d (idea_id, status, komentarz, with_expert, ago)
join auth.users ru on ru.email = 'demo.rops@example.org'
join public.profiles rops on rops.id = ru.id
left join auth.users eu on eu.email = 'demo.ekspert@example.org' and d.with_expert
left join public.profiles ekspert on ekspert.id = eu.id
where exists (select 1 from public.ideas i where i.id = d.idea_id::uuid);

commit;
