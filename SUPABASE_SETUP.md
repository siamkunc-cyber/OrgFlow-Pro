# OrgFlow Pro — Supabase Setup Checklist

## A. Supabase

- [ ] Create Project
- [ ] Run `supabase/schema.sql`
- [ ] Confirm table `public.org_employees`
- [ ] Confirm RLS = ON
- [ ] Confirm policies exist for `authenticated`
- [ ] Create first user under Authentication > Users
- [ ] Copy Project URL
- [ ] Copy Publishable Key / legacy anon key

## B. Local project

Edit `js/config.js`.

Do NOT paste the `service_role` key.

## C. GitHub

- [ ] Create GitHub repository
- [ ] Push all files
- [ ] Settings > Pages > Source = GitHub Actions
- [ ] Push to `main`
- [ ] Open the generated Pages URL

## D. Supabase Auth redirect

For Email/Password login, the app can run from the GitHub Pages URL without an OAuth provider.

If you later add Google/Microsoft/LINE login, add the GitHub Pages URL to Supabase Auth Redirect URLs.

## E. Production security

For a real HR system, add an organization/tenant model before allowing users from multiple companies. The current SQL intentionally protects the table at the authenticated-user level; it does not yet isolate multiple companies from one another.
