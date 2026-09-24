# Siamhrbp OrgFlow-Pro — STEP 8.8 REAL FIX

## Why this patch exists

The deployed GitHub source was still running STEP 8.6 `production-bootstrap.js`, while `app.js` still contains its own `DOMContentLoaded -> startOrgApp()` auto-start.

That created two competing boot owners and, more importantly, `app.js` could fall back to local/demo data when Supabase returned zero rows.

The screenshot's Chrome **Page Unresponsive** dialog is consistent with the application boot/render path becoming unstable after login.

## STEP 8.8 strategy

Only replace:

`js/production-bootstrap.js`

Do NOT modify Supabase RLS, users, profiles, or passwords.
Do NOT delete/recreate the Auth users.

This patch:

1. Loads the application scripts once.
2. Patches `OrgAppController.loadInitialData()` before its legacy DOMContentLoaded startup executes.
3. Makes authenticated Supabase the only data source.
4. Treats `org_employees = 0` as a valid state.
5. Disables localStorage/demo fallback in Production.
6. Waits for the single `window.OrgApp` instance created by app.js.
7. Performs one authoritative cloud refresh.
8. Clears application data on logout instead of restoring demo data.

## Deploy

GitHub repository:
`siamkunc-cyber/OrgFlow-Pro`

Branch:
`main`

Replace:
`js/production-bootstrap.js`

Commit:
`STEP 8.8 REAL FIX - Single Boot + Cloud Source of Truth`

Then wait for GitHub Pages deployment.

## Test

Use Chrome Incognito.

1. `sudarat@starliveonline.local` -> password -> should enter.
2. `siamhrbp@siamhrbp.com` -> correct password -> should enter without MFA when failure counter is <= 5.
3. Verify header shows Online + role + Logout.
4. Verify Supabase has 0 employees -> application shows 0 employees and does NOT show demo records.
5. Click Logout -> login page returns.

Do not test 10 wrong passwords in a row. Supabase Auth has its own rate limiting.

## Expected browser console

`[STEP8.8] Production boot complete: 0 employees`

(or the actual Supabase employee count if rows exist).
