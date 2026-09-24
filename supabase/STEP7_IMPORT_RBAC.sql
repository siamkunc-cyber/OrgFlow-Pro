
-- ============================================================
-- OrgFlow Pro V2.1
-- STEP 7 - Import / RBAC hardening
--
-- IMPORTANT:
-- This script does NOT delete tables or employee data.
-- It only ensures the current role helper and RLS are aligned.
-- Your current Supabase project already has the six orgflow_*
-- policies, so this script is safe to run with IF EXISTS.
-- ============================================================

-- 1) Current-role helper
create or replace function public.orgflow_current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.role
  from public.org_user_profiles p
  where p.user_id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

revoke all on function public.orgflow_current_role() from public;
grant execute on function public.orgflow_current_role() to authenticated;


-- 2) Ensure the two application tables have RLS enabled.
alter table public.org_employees enable row level security;
alter table public.org_user_profiles enable row level security;


-- 3) Remove only obsolete/legacy employee policies if present.
drop policy if exists "org_employees_select_authenticated" on public.org_employees;
drop policy if exists "org_employees_insert_authenticated" on public.org_employees;
drop policy if exists "org_employees_update_authenticated" on public.org_employees;
drop policy if exists "org_employees_delete_authenticated" on public.org_employees;


-- 4) Ensure the intended policies exist.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='org_employees'
      and policyname='orgflow_employees_view'
  ) then
    create policy "orgflow_employees_view"
      on public.org_employees
      for select
      to authenticated
      using (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN','EMPLOYEE'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='org_employees'
      and policyname='orgflow_employees_insert'
  ) then
    create policy "orgflow_employees_insert"
      on public.org_employees
      for insert
      to authenticated
      with check (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='org_employees'
      and policyname='orgflow_employees_update'
  ) then
    create policy "orgflow_employees_update"
      on public.org_employees
      for update
      to authenticated
      using (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN'))
      with check (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='org_employees'
      and policyname='orgflow_employees_delete'
  ) then
    create policy "orgflow_employees_delete"
      on public.org_employees
      for delete
      to authenticated
      using (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='org_user_profiles'
      and policyname='orgflow_profiles_view_self'
  ) then
    create policy "orgflow_profiles_view_self"
      on public.org_user_profiles
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='org_user_profiles'
      and policyname='orgflow_profiles_admin'
  ) then
    create policy "orgflow_profiles_admin"
      on public.org_user_profiles
      for all
      to authenticated
      using (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN'))
      with check (public.orgflow_current_role() in ('SUPER_ADMIN','HR_ADMIN'));
  end if;
end $$;


-- 5) Make the self-referencing FK deferrable.
-- This allows a single atomic transaction to import a hierarchy
-- even when Excel rows are not already sorted by manager.
do $$
declare
  c_name text;
begin
  select tc.constraint_name
    into c_name
  from information_schema.table_constraints tc
  where tc.table_schema='public'
    and tc.table_name='org_employees'
    and tc.constraint_type='FOREIGN KEY'
    and tc.constraint_name like '%reports_to%'
  limit 1;

  if c_name is not null then
    execute format(
      'alter table public.org_employees alter constraint %I deferrable initially deferred',
      c_name
    );
  end if;
end $$;


-- 6) Verification query.
select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname='public'
  and tablename in ('org_employees','org_user_profiles')
order by tablename, policyname;
