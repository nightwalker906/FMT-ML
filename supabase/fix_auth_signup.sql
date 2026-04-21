-- Direct database fix for "Database error saving new user" during Supabase signup.
--
-- This app already creates the profile AFTER Auth signup succeeds:
-- - frontend/app/login/page.tsx
-- - frontend/app/api/auth/create-profile/route.ts
--
-- So if signup is failing before profile creation, the safest fix is to remove
-- stale custom triggers on auth.users that still try to insert into public tables
-- using old schema assumptions.

begin;

-- Remove any custom PUBLIC-schema triggers attached to auth.users.
-- These are the usual source of "Database error saving new user".
do $$
declare
  trigger_row record;
begin
  for trigger_row in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace table_schema on table_schema.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace function_schema on function_schema.oid = p.pronamespace
    where not t.tgisinternal
      and table_schema.nspname = 'auth'
      and c.relname = 'users'
      and function_schema.nspname = 'public'
  loop
    execute format('drop trigger if exists %I on auth.users', trigger_row.tgname);
  end loop;
end;
$$;

-- Optional hardening: if anything inserts a profile without user_type,
-- default to 'student' instead of failing.
alter table public.profiles
  alter column user_type set default 'student';

commit;

-- After running this:
-- 1. Retry signup with a brand-new email address.
-- 2. The app should create public.profiles itself after auth signup succeeds.
