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

commit;
