# STEP 8.1 — Login/MFA Production Bootstrap

## Purpose
Prevent `app.js` and the D3 organization chart from booting before Supabase authentication and MFA/AAL2 succeed.

## Install
1. Replace repository `index.html` with the included `index.html`.
2. Upload `js/production-bootstrap.js`.
3. Keep the existing `js/auth-gate.js`, `js/supabase-service.js`, and `js/config.js`.
4. `config.js` must contain the Supabase project URL and **publishable** key (`sb_publishable_...`), never a secret key.
5. Commit to `main` and wait for GitHub Pages deployment.
6. Hard refresh with Ctrl+Shift+R.

## Expected flow
Browser -> Auth Gate -> Email/Password -> TOTP enrollment/challenge -> AAL2 -> dynamically load sample-data/excel/chart/app/permissions -> OrgFlow Cloud.

## Important
The existing `app.js` is intentionally not loaded directly from `index.html`. This prevents its startup routine from loading local/demo data and rendering the chart before authentication.
