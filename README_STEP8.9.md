# STEP 8.9 — REAL BOOT / MENU / HANG FIX

## What this fixes
1. Removes the legacy `app.js` auto-start race.
2. Creates exactly one `OrgAppController` instance after authentication.
3. Prevents localStorage/demo fallback in Production.
4. Keeps the page locked until the real application boot completes.
5. Moves the Online/Logout status INSIDE the header instead of using a fixed overlay that blocks menu buttons.
6. Uses Supabase as the only source of truth after login; 0 rows stays 0 rows.

## Replace on GitHub
- `js/auth-gate.js`
- `js/production-bootstrap.js`

No SQL changes are required for this step.

## Deploy
Commit to `main`:
`STEP 8.9 REAL BOOT - FIX HANG AND HEADER STATUS`

Then open the site in Incognito or use Ctrl+Shift+R.

## Expected
- Sudarat / HR_ADMIN: login -> app usable -> inline Online status -> Logout.
- Siamhrbp / SUPER_ADMIN: correct password on first login -> app usable, no MFA unless the >5-failed-attempt rule is met.
- Supabase `org_employees = 0` -> UI shows 0 employees, never Demo data.
- Header Online/Logout pill does not float over or block the menu.

## Important
Do not delete or recreate Auth users for this step. Do not change RLS policies.
