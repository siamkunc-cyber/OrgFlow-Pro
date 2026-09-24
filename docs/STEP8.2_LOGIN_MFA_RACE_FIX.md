# STEP 8.2 — Login + MFA Race Fix

## Problem fixed
After email/password sign-in, Supabase emits `SIGNED_IN`. The previous Auth Gate
also reacted to that event while the original login flow was still running.
This could start MFA enrollment twice. The QR screen appeared briefly and then
the user was returned to the Login screen.

## Fix
`js/auth-gate.js` now serializes the authentication flow with `authFlowBusy`.
Auth-state callbacks are ignored while password login, MFA enrollment, or MFA
verification is in progress.

## First login
1. Enter email/password.
2. If no verified TOTP factor exists, a QR enrollment screen is shown.
3. Scan QR with an authenticator.
4. Enter the 6-digit code.
5. Supabase upgrades the session to AAL2.
6. The application bootstrap starts.

## Existing MFA
1. Enter email/password.
2. Enter the 6-digit TOTP code.
3. Verify challenge.
4. Session reaches AAL2.
5. Application starts.

## Important
If a previous failed test left an `unverified` TOTP factor on the account,
the new code will not silently create another factor. Remove the abandoned
unverified factor in Supabase Auth, then retry.

No service_role/secret key is used in browser code.
