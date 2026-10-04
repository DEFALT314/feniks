-- Permission tests for the shared tables (P4). Run only inside a transaction that is rolled back.
-- Against the linked database (migration already applied):
--   (echo "begin;"; cat supabase/tests/wspolne_rls.sql; echo "rollback;") > /tmp/t.sql \
--     && pnpm exec supabase db query --linked -f /tmp/t.sql
-- Output: rows (test, ok). Every row must have ok = true.

create temp table wyniki (test text, ok boolean);
grant all on wyniki to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'test-mieszkaniec@example.org', '{"nazwa_wyswietlana":"Test Mieszkaniec"}'),
  ('00000000-0000-4000-8000-0000000000a2', 'test-inny@example.org', '{}'),
  ('00000000-0000-4000-8000-0000000000a3', 'test-admin@example.org', '{}');

insert into wyniki select 'trigger creates a mieszkaniec profile with display name',
  exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'
          and role = 'mieszkaniec' and nazwa_wyswietlana = 'Test Mieszkaniec');

update public.profiles set role = 'rops_admin' where id = '00000000-0000-4000-8000-0000000000a3';
-- ROPS accounts in this database (test admin plus any demo or real ones), counted before RLS applies.
create temp table rops_accounts as
  select count(*) as n from public.profiles where role in ('rops_redaktor', 'rops_admin');
grant select on rops_accounts to authenticated, anon;

-- ---------- as mieszkaniec ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

insert into wyniki select 'mieszkaniec: moja_rola()', public.moja_rola() = 'mieszkaniec';
insert into wyniki select 'mieszkaniec sees only own profile', (select count(*) from public.profiles) = 1;

do $$ begin
  update public.profiles set role = 'rops_admin' where id = auth.uid();
  insert into wyniki values ('mieszkaniec cannot grant themselves a role', false);
exception when others then
  insert into wyniki values ('mieszkaniec cannot grant themselves a role', true);
end $$;

update public.profiles set nazwa_wyswietlana = 'Nowa nazwa', wnioskowana_rola = 'ngo' where id = auth.uid();
insert into wyniki select 'mieszkaniec updates own name and requests a role',
  (select nazwa_wyswietlana = 'Nowa nazwa' and wnioskowana_rola = 'ngo' from public.profiles where id = auth.uid());

update public.profiles set nazwa_wyswietlana = 'X' where id = '00000000-0000-4000-8000-0000000000a2';
insert into wyniki select 'mieszkaniec cannot update another profile (0 rows)',
  not exists (select 1 from public.profiles where nazwa_wyswietlana = 'X');

-- One notification per ROPS account (the test admin plus any demo or real ROPS accounts).
insert into wyniki select 'mieszkaniec notifies every ROPS account',
  public.dodaj_powiadomienie('pomysl_wyslany', 'Nowy pomysł', '/admin', null, array['rops_redaktor','rops_admin'])
    = (select n from rops_accounts);
insert into wyniki select 'mieszkaniec cannot notify another mieszkaniec',
  public.dodaj_powiadomienie('spam', 'Spam', null, array['00000000-0000-4000-8000-0000000000a2']::uuid[], null) = 0;
insert into wyniki select 'mieszkaniec notifies themselves',
  public.dodaj_powiadomienie('test', 'Do siebie', null, array[auth.uid()], null) = 1;
insert into wyniki select 'mieszkaniec sees only own notifications', (select count(*) from public.notifications) = 1;

do $$ begin
  insert into public.notifications (user_id, typ, tytul) values ('00000000-0000-4000-8000-0000000000a2', 'x', 'y');
  insert into wyniki values ('direct insert into notifications is blocked', false);
exception when others then
  insert into wyniki values ('direct insert into notifications is blocked', true);
end $$;

update public.notifications set przeczytane = true;
insert into wyniki select 'mieszkaniec marks own notifications as read',
  (select bool_and(przeczytane) from public.notifications);

do $$ begin
  update public.notifications set tytul = 'zmieniony';
  insert into wyniki values ('mieszkaniec cannot change notification content', false);
exception when others then
  insert into wyniki values ('mieszkaniec cannot change notification content', true);
end $$;

insert into wyniki select 'zapisz_audit works', public.zapisz_audit('test.akcja', 'profiles:a1', '{}') > 0;
insert into wyniki select 'mieszkaniec cannot read the audit log', (select count(*) from public.audit_log) = 0;

do $$ begin
  insert into public.instytucje (nazwa, typ, zweryfikowana) values ('Fałszywa', 'gmina', true);
  insert into wyniki values ('mieszkaniec cannot add a verified institution', false);
exception when others then
  insert into wyniki values ('mieszkaniec cannot add a verified institution', true);
end $$;
insert into public.instytucje (nazwa, typ) values ('Gmina Testowa', 'gmina');
insert into wyniki select 'mieszkaniec submits an unverified institution',
  exists (select 1 from public.instytucje where nazwa = 'Gmina Testowa' and not zweryfikowana);

-- ---------- as anonymous ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into wyniki select 'anon: moja_rola() is null', public.moja_rola() is null;
insert into wyniki select 'anon sees no profiles', (select count(*) from public.profiles) = 0;
insert into wyniki select 'anon sees institutions', (select count(*) from public.instytucje) >= 1;
do $$ begin
  perform public.zapisz_audit('x', 'y', '{}');
  insert into wyniki values ('anon cannot call zapisz_audit', false);
exception when others then
  insert into wyniki values ('anon cannot call zapisz_audit', true);
end $$;

-- ---------- as rops_admin ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
insert into wyniki select 'admin sees all profiles', (select count(*) from public.profiles) >= 3;
update public.profiles set role = 'ngo', wnioskowana_rola = null where id = '00000000-0000-4000-8000-0000000000a1';
insert into wyniki select 'admin grants role ngo',
  (select role = 'ngo' from public.profiles where id = '00000000-0000-4000-8000-0000000000a1');
insert into wyniki select 'admin reads the audit log', (select count(*) from public.audit_log) >= 1;
insert into wyniki select 'admin notifies any user',
  public.dodaj_powiadomienie('pomysl_oceniony', 'Ocena', null, array['00000000-0000-4000-8000-0000000000a2']::uuid[], null) = 1;
update public.instytucje set zweryfikowana = true where nazwa = 'Gmina Testowa';
insert into wyniki select 'admin verifies an institution',
  (select zweryfikowana from public.instytucje where nazwa = 'Gmina Testowa');

reset role;
select test, ok from wyniki;
