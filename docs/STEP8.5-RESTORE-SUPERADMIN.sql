-- STEP 8.5: Restore SUPER_ADMIN profile after deleting/recreating the Auth user.
-- Run in Supabase SQL Editor (Production). This does NOT create/reset a password.
-- It only links the current Auth user by email to the application profile.

INSERT INTO public.org_user_profiles (user_id, full_name, role, is_active)
SELECT id,
       'Siamhrbp Super Admin',
       'SUPER_ADMIN',
       true
FROM auth.users
WHERE lower(email) = lower('siamhrbp@siamhrbp.com')
ON CONFLICT (user_id) DO UPDATE
SET role = 'SUPER_ADMIN',
    is_active = true,
    full_name = EXCLUDED.full_name;

-- Verify the result:
SELECT u.id, u.email, p.full_name, p.role, p.is_active
FROM auth.users u
LEFT JOIN public.org_user_profiles p ON p.user_id = u.id
WHERE lower(u.email) = lower('siamhrbp@siamhrbp.com');
