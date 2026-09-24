# Siamhrbp OrgFlow-Pro — STEP 8.5

## Fixed
1. HR_ADMIN / EMPLOYEE no longer get blocked by MFA. Password login is enough.
2. MFA is evaluated only for SUPER_ADMIN and only after more than 5 consecutive wrong-password attempts. That means the 6th failure triggers MFA on the next successful SUPER_ADMIN login.
3. SUPER_ADMIN first MFA enrollment shows QR + Secret Key + 6-digit verification and remains on the page until verification succeeds.
4. Added persistent logged-in account status in the application header: green online indicator + full name + role.
5. Added/retained explicit Logout behavior through the application auth button.
6. Added SQL to restore `siamhrbp@siamhrbp.com` as SUPER_ADMIN after an Auth account was deleted and recreated.

## Important test
- `sudarat@starliveonline.local` (HR_ADMIN): login should enter the application without MFA.
- `siamhrbp@siamhrbp.com` (SUPER_ADMIN): use the correct password normally. To test MFA, intentionally fail the password 6 consecutive times, then log in with the correct password.
- The failure counter is stored in browser localStorage in this step. It is suitable for functional testing but is not tamper-proof security enforcement. A server-side/Edge Function implementation should be used for strict production enforcement later.

## Supabase recovery
Run `STEP8.5-RESTORE-SUPERADMIN.sql` in the Production SQL Editor after confirming the Auth user exists.
