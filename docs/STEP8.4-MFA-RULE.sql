-- STEP 8.4 — Optional server-side MFA threshold ledger
-- This is the production-hardening layer for the "more than 5 consecutive failures"
-- rule. The browser package can run without this table, but localStorage is tamperable.
--
-- IMPORTANT:
-- Supabase Auth itself remains the authority for password verification/rate limiting.
-- This ledger is only for the business rule that a SUPER_ADMIN must use MFA after
-- more than 5 consecutive failed password attempts.
--
-- Before running in Production, review this SQL with your existing RLS policies.

create table if not exists public.org_auth_attempts (
  email text primary key,
  failed_attempts integer not null default 0,
  last_failed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.org_auth_attempts enable row level security;

revoke all on public.org_auth_attempts from anon, authenticated;

create or replace function public.orgflow_record_failed_login(p_email text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_count integer;
begin
  if v_email is null or v_email = '' then
    return 0;
  end if;

  insert into public.org_auth_attempts(email, failed_attempts, last_failed_at, updated_at)
  values (v_email, 1, now(), now())
  on conflict (email) do update
    set failed_attempts = public.org_auth_attempts.failed_attempts + 1,
        last_failed_at = now(),
        updated_at = now()
  returning failed_attempts into v_count;

  return v_count;
end;
$$;

create or replace function public.orgflow_reset_failed_login(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.org_auth_attempts
  where email = lower(trim(p_email));
end;
$$;

revoke all on function public.orgflow_record_failed_login(text) from public;
revoke all on function public.orgflow_reset_failed_login(text) from public;
grant execute on function public.orgflow_record_failed_login(text) to anon, authenticated;
grant execute on function public.orgflow_reset_failed_login(text) to authenticated;
