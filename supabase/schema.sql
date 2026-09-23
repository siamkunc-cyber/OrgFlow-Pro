-- OrgFlow Pro: Supabase database setup
-- Run this in Supabase Dashboard > SQL Editor.
--
-- Security model:
-- 1) Users authenticate with Supabase Auth.
-- 2) RLS allows only authenticated users to read/write this table.
-- 3) NEVER put a service_role/secret key in GitHub or browser code.

create table if not exists public.org_employees (
  id text primary key,
  name text not null,
  position text not null,
  department text not null default 'General',
  reports_to text null references public.org_employees(id) on update cascade on delete set null,
  role_level text not null default 'Staff',
  email text null,
  phone text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_employees_reports_to
  on public.org_employees(reports_to);

create index if not exists idx_org_employees_department
  on public.org_employees(department);

alter table public.org_employees enable row level security;

drop policy if exists "org_employees_select_authenticated" on public.org_employees;
create policy "org_employees_select_authenticated"
on public.org_employees
for select
to authenticated
using (true);

drop policy if exists "org_employees_insert_authenticated" on public.org_employees;
create policy "org_employees_insert_authenticated"
on public.org_employees
for insert
to authenticated
with check (true);

drop policy if exists "org_employees_update_authenticated" on public.org_employees;
create policy "org_employees_update_authenticated"
on public.org_employees
for update
to authenticated
using (true)
with check (true);

drop policy if exists "org_employees_delete_authenticated" on public.org_employees;
create policy "org_employees_delete_authenticated"
on public.org_employees
for delete
to authenticated
using (true);

create or replace function public.set_org_employees_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_org_employees_updated_at on public.org_employees;
create trigger trg_org_employees_updated_at
before update on public.org_employees
for each row execute function public.set_org_employees_updated_at();

-- Optional: grant Data API table privileges if your project has customized defaults.
grant select, insert, update, delete on public.org_employees to authenticated;

-- IMPORTANT:
-- Do not grant table access to anon for this HR data table.
-- Create users from Supabase Dashboard > Authentication > Users.
