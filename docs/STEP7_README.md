
# OrgFlow Pro V2.1 — STEP 7

## Goal
Finish the migration from Excel/LocalStorage as a data store to:

Browser -> Supabase Auth -> Supabase PostgreSQL

Excel/CSV is only an import/export format.

## Files

- `js/supabase-service.js` — replacement service with role lookup and safe import.
- `js/permissions-import.js` — frontend RBAC + import preview/confirmation.
- `supabase/STEP7_IMPORT_RBAC.sql` — Supabase hardening/verification SQL.

## Required role matrix

| Role | View Org | Add | Edit | Delete | Import |
|---|---:|---:|---:|---:|---:|
| SUPER_ADMIN | Yes | Yes | Yes | Yes | Yes |
| HR_ADMIN | Yes | Yes | Yes | Yes | Yes |
| EMPLOYEE | Yes | No | No | No | No |

## Install

1. Replace `js/supabase-service.js` with the file in this package.
2. Copy `js/permissions-import.js` into the repository.
3. In `index.html`, immediately after:
   `<script src="js/app.js"></script>`
   add:
   `<script src="js/permissions-import.js"></script>`
4. In Supabase SQL Editor run `supabase/STEP7_IMPORT_RBAC.sql`.
5. Push to GitHub `main`.
6. Wait for GitHub Pages deployment.
7. Login with each of the 3 role types and verify the UI.

## Import behavior

- Import button is visible only for SUPER_ADMIN and HR_ADMIN.
- Excel/CSV is parsed in the browser.
- Duplicate IDs and circular reporting are rejected.
- User sees a preview/confirmation before writing.
- Data is written to Supabase.
- After import, the app reloads the authoritative list from Supabase.
- LocalStorage is only a convenience cache; it is not the database.

## Security

The frontend role check is UX protection only.
Supabase RLS remains the real authorization boundary.

Never place a service_role/secret key in `js/config.js`.
