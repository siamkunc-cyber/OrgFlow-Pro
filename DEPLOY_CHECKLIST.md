# OrgFlow Pro V2 — Deploy Checklist

## GitHub
- [ ] Repository: `siamkunc-cyber/OrgFlow-Pro`
- [ ] All files from this ZIP are uploaded to the repository root
- [ ] Branch: `main`
- [ ] `.github/workflows/pages.yml` exists
- [ ] GitHub → Settings → Pages → Source = **GitHub Actions**
- [ ] Actions → `Deploy OrgFlow Pro to GitHub Pages` is green
- [ ] Open `https://siamkunc-cyber.github.io/OrgFlow-Pro/`

## Supabase
- [ ] Run `supabase/schema.sql`
- [ ] Create Auth user
- [ ] Copy Project URL and Publishable/Anon key into `js/config.js`
- [ ] Never use `service_role`/secret key in frontend
- [ ] Push the changed `js/config.js` to GitHub only if the key is a publishable/anon key and RLS is enabled

## Browser test
1. Page opens with the OrgFlow demo chart — not README.
2. Login button appears in the top-right.
3. After login, status changes to `Supabase Cloud`.
4. Add an employee.
5. Check Supabase → Table Editor → `org_employees`.
6. Refresh browser and confirm the employee remains.
7. Edit and delete an employee and verify the database changes.
8. Excel/CSV is only used for import/export.
