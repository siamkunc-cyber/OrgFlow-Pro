-- OrgFlow Pro V2 - Supabase schema
-- Run this script in Supabase SQL Editor.

create table if not exists public.org_employees (
  id text primary key,
  name text not null,
  position text not null,
  department text not null default 'General',
  reports_to text references public.org_employees(id) on update cascade on delete set null,
  role_level text not null default 'Staff',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_employees_reports_to on public.org_employees(reports_to);
create index if not exists idx_org_employees_department on public.org_employees(department);

create or replace function public.org_employees_set_updated_at()
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
for each row execute function public.org_employees_set_updated_at();

alter table public.org_employees enable row level security;

drop policy if exists "org_employees_select_authenticated" on public.org_employees;
drop policy if exists "org_employees_insert_authenticated" on public.org_employees;
drop policy if exists "org_employees_update_authenticated" on public.org_employees;
drop policy if exists "org_employees_delete_authenticated" on public.org_employees;

create policy "org_employees_select_authenticated"
on public.org_employees for select to authenticated using (true);

create policy "org_employees_insert_authenticated"
on public.org_employees for insert to authenticated with check (true);

create policy "org_employees_update_authenticated"
on public.org_employees for update to authenticated using (true) with check (true);

create policy "org_employees_delete_authenticated"
on public.org_employees for delete to authenticated using (true);

-- Optional: seed the table by using the application's Excel import or Demo -> Cloud Sync.
