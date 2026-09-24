# Siamhrbp OrgFlow-Pro — STEP 8.6

## Fixes
1. SUPER_ADMIN is NOT forced to AAL2 on normal password login.
2. MFA is required only when the SUPER_ADMIN has >5 consecutive failed password attempts and then enters the correct password.
3. HR_ADMIN / EMPLOYEE never enter this MFA flow.
4. Visible failed-attempt counter appears on the login page.
5. Counter uses a new localStorage key (`siamhrbp_orgflow_auth_attempts_v86`) so old test state does not silently interfere.
6. Persistent online status is shown after login.
7. Persistent `↪ ออกระบบ` button is shown after login.
8. Logout returns to the login gate and clears the Supabase session.
9. Production bootstrap treats Supabase as the source of truth: 0 cloud employees = 0 employees, never demo/local fallback.
10. Bootstrap cache-bust is `v=8.6`.

## Important test note
Supabase Auth has server-side rate limiting. Do not repeatedly enter wrong passwords many times in a short period. For the business-rule test, use exactly 6 wrong attempts, then the correct password after the Auth rate-limit window permits the correct login.

## Deploy
Replace these files in GitHub `main`:
- `js/auth-gate.js`
- `js/production-bootstrap.js`

Then hard refresh GitHub Pages (Ctrl+Shift+R). If the browser still serves old JavaScript, open the site in an Incognito window.

## SUPER_ADMIN recovery
Run `STEP8.6-RESTORE-SUPERADMIN.sql` in Supabase Production after an Auth user was deleted/re-created. The resulting profile must show role `SUPER_ADMIN` and `is_active = true`.

## Expected tests
### HR_ADMIN
`sudarat@starliveonline.local` + correct password -> login -> online status -> no MFA -> logout visible.

### SUPER_ADMIN normal login
`siamhrbp@siamhrbp.com` + correct password -> login -> online status -> no MFA while failure counter is <=5.

### SUPER_ADMIN MFA threshold
1. Wrong password x6.
2. Login page must visibly show `รหัสผ่านผิดติดต่อกัน: 6 ครั้ง`.
3. Enter correct password.
4. TOTP enrollment/challenge must appear.
5. After successful TOTP verification, enter application and counter resets.

### Note
The browser-side counter is a UX/business-flow counter, not tamper-resistant security. Supabase Auth remains responsible for server-side brute-force/rate limiting.
