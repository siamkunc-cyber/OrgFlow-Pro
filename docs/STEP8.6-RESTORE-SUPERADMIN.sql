-- STEP 8.6 — Restore the current Auth user as SUPER_ADMIN.
-- Run in Supabase SQL Editor (Production).
-- This does NOT change the password and does NOT create an Auth user.

INSERT INTO public.org_user_profiles
    (user_id, full_name, role, is_active)
SELECT
    id,
    'Siamhrbp Super Admin',
    'SUPER_ADMIN',
    true
FROM auth.users
WHERE lower(email) = lower('siamhrbp@siamhrbp.com')
ON CONFLICT (user_id) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    role = 'SUPER_ADMIN',
    is_active = true;

SELECT
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.is_active
FROM auth.users u
LEFT JOIN public.org_user_profiles p ON p.user_id = u.id
WHERE lower(u.email) = lower('siamhrbp@siamhrbp.com');

-- Optional diagnostic: check whether this account already has a verified TOTP factor.
-- SELECT id, user_id, friendly_name, factor_type, status, created_at
-- FROM auth.mfa_factors
-- WHERE user_id = (SELECT id FROM auth.users WHERE lower(email)=lower('siamhrbp@siamhrbp.com'))
-- ORDER BY created_at DESC;
