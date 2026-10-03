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

-- Conversation from design/makiety/Wiadomosci.dc.html on the first idea (#8). Threads started by
-- demo accounts are removed first; idea threads go away with the ideas above (cascade).
delete from public.threads th
using auth.users u
where th.created_by = u.id and u.email like 'demo.%@example.org';

insert into public.threads (id, temat, idea_id, created_by, created_at, last_message_at)
select 'd2000000-0000-4000-8000-000000000001', 'Sąsiedzki dyżur po wypisie',
  'd1000000-0000-4000-8000-000000000001', u.id, now() - interval '15 minutes', now() - interval '2 minutes'
from auth.users u where u.email = 'demo.rops@example.org'
  and exists (select 1 from public.ideas where id = 'd1000000-0000-4000-8000-000000000001');

insert into public.thread_participants (thread_id, user_id, nazwa, rola, last_read_at)
select 'd2000000-0000-4000-8000-000000000001', p.id, p.nazwa_wyswietlana, p.role, now() - interval '5 minutes'
from auth.users u join public.profiles p on p.id = u.id
where u.email in ('demo.rops@example.org', 'demo.ekspert@example.org', 'demo.fundacja@example.org')
  and exists (select 1 from public.threads where id = 'd2000000-0000-4000-8000-000000000001');

insert into public.messages (thread_id, autor_id, autor_nazwa, autor_rola, tresc, created_at)
select 'd2000000-0000-4000-8000-000000000001', p.id, p.nazwa_wyswietlana, p.role, d.tresc, now() - d.ago::interval
from (values
  ('demo.rops@example.org', 'Dziękujemy za fiszkę. Pomysł dobrze uzupełnia innowację „Organizator kompleksowej opieki w miejscu zamieszkania”. Prosimy dopisać, jak wolontariusze będą współpracować z ośrodkiem pomocy społecznej. Przypisaliśmy mentorkę.', '10 minutes'),
  ('demo.ekspert@example.org', 'Chętnie pomogę. Proponuję krótką rozmowę w tym tygodniu, przygotuję listę pytań do OPS.', '6 minutes'),
  ('demo.fundacja@example.org', 'Dziękujemy! Uzupełnimy fiszkę do jutra.', '2 minutes')
) as d (email, tresc, ago)
join auth.users u on u.email = d.email
join public.profiles p on p.id = u.id
where exists (select 1 from public.threads where id = 'd2000000-0000-4000-8000-000000000001');

-- Demo calls (#10): the same ids as P3's data/derived/demo-calls.json, so generated applications
-- keep working. Reset restores their text, deadlines and the "published" switch.
insert into public.calls (id, nazwa, organizator, cel, termin_od, termin_do, obszary, opublikowany, demo) values
  ('nabor-demo-seniorzy-2026', 'Wsparcie seniorów w miejscu zamieszkania', 'Regionalny Ośrodek Polityki Społecznej w Krakowie',
   'Usługi i rozwiązania, które pomagają osobom starszym dłużej mieszkać samodzielnie we własnym domu i zmniejszają ich samotność.',
   '2026-10-01', '2026-11-30', '{seniorzy}', true, true),
  ('nabor-demo-inkubator-2026', 'Inkubator innowacji społecznych – testowanie pomysłów', 'Regionalny Ośrodek Polityki Społecznej w Krakowie',
   'Przygotowanie prototypu nowego rozwiązania społecznego i przetestowanie go z odbiorcami w małopolskiej gminie.',
   '2026-10-01', '2026-12-15', '{seniorzy,niepelnosprawnosc,rodzina-piecza,ubostwo,bezdomnosc,cudzoziemcy,zdrowie,zdrowie-psychiczne}', true, true),
  ('nabor-demo-dostepnosc-2026', 'Dostępność usług publicznych dla osób z niepełnosprawnościami', 'Regionalny Ośrodek Polityki Społecznej w Krakowie',
   'Rozwiązania, które usuwają bariery w dostępie do urzędów, transportu, kultury i usług społecznych.',
   '2026-11-01', '2027-01-31', '{niepelnosprawnosc}', true, true)
on conflict (id) do update set nazwa = excluded.nazwa, organizator = excluded.organizator, cel = excluded.cel,
  termin_od = excluded.termin_od, termin_do = excluded.termin_do, obszary = excluded.obszary,
  opublikowany = excluded.opublikowany, demo = true;

commit;
