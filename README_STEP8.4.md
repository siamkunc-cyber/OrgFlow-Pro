# STEP 8.4 — MFA Rule Corrected

## Business rule

1. Normal users log in with Email + Password.
2. Password failure counter increments for consecutive failed attempts.
3. MFA is triggered only after **more than 5** consecutive failures (6th failed attempt reached).
4. MFA applies **only to `SUPER_ADMIN`**.
5. `HR_ADMIN` and `EMPLOYEE` never enter the MFA screen from this rule.
6. On successful SUPER_ADMIN MFA, the failure counter is reset.
7. Existing sessions do not retroactively trigger MFA; the rule is evaluated on a new password login.

## Install

Replace:
- `js/auth-gate.js`

Add:
- `js/production-bootstrap.js`

Keep:
- `js/config.js` with the `sb_publishable_...` key.
- `js/supabase-service.js`

`index.html` must load only:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config.js"></script>
<script src="js/supabase-service.js"></script>
<script src="js/auth-gate.js"></script>
<script src="js/production-bootstrap.js"></script>
```

Do NOT directly load `app.js`, `sample-data.js`, `excel-service.js`, `chart-renderer.js`, or `permissions-import.js` in index.html. The bootstrap loads them after authentication.

## Security note

The browser counter is not tamper-resistant. For true production enforcement, run `STEP8.4-MFA-RULE.sql` and then wire the two RPCs into the login failure/success path. Supabase Auth's own server-side rate limiting remains the authoritative password-abuse control.
