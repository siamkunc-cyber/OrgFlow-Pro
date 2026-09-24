Siamhrbp OrgFlow-Pro — STEP 8 FINAL LOGIN + MFA
====================================================

Upload/replace this file:
  js/auth-gate.js

Then make ONE small change in index.html.

Find:
  <script src="js/supabase-service.js"></script>

Immediately after it add:
  <script src="js/auth-gate.js"></script>

The final order must be:
  <script src="js/config.js"></script>
  <script src="js/supabase-service.js"></script>
  <script src="js/auth-gate.js"></script>
  <script src="js/sample-data.js"></script>
  <script src="js/excel-service.js"></script>
  <script src="js/chart-renderer.js"></script>
  <script src="js/app.js"></script>

WHAT THIS STEP CHANGES
----------------------
1. Renames visible application branding to:
   Siamhrbp OrgFlow-Pro

2. Adds a full-screen Login gate before the application.
   - Email / username field (Supabase Auth currently authenticates by email)
   - Password field
   - Show / hide password button
   - Dark split-screen UI based on the supplied reference screenshot
   - Responsive mobile layout

3. Adds mandatory second-step MFA using Supabase TOTP.
   - Existing verified factor -> enter 6-digit Authenticator code
   - No factor yet -> QR enrollment is shown and must be verified
   - Access is released only after AAL2

4. Removes the visible Demo workflow after successful login.
   Cloud data is loaded from public.org_employees, including an empty table.
   It will NOT use the 18/46 demo records after authentication.

5. Removes the "โหลดตัวอย่างตั้งต้น" action after login.

6. Adds a short client-side cooldown after 5 failed password attempts.
   This is UI protection only; Supabase Auth remains the real authentication/rate-limit boundary.

IMPORTANT CONFIGURATION
-----------------------
The current repository js/config.js has blank:
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY

Do NOT put a service_role/secret key in the browser.

You must set:
  SUPABASE_URL: https://<your-project-ref>.supabase.co
  SUPABASE_PUBLISHABLE_KEY: <your Supabase publishable/anon key>

Then deploy to GitHub Pages.

MFA
---
No SQL migration is required for the TOTP flow in this patch.
Supabase Auth's MFA APIs are used directly from the browser.
Make sure MFA verification is enabled in Supabase Auth settings.

FIRST LOGIN
-----------
For an account that has no TOTP factor, the first successful password login will show:
  1. QR Code
  2. Secret Key fallback
  3. 6-digit code field
  4. "เปิดใช้งาน MFA"

After successful verification, the account reaches AAL2 and enters the application.

SUBSEQUENT LOGINS
-----------------
  Email + Password
       ↓
  MFA 6-digit code
       ↓
  Siamhrbp OrgFlow-Pro

FILES IN THIS ZIP
-----------------
  js/auth-gate.js
  docs/STEP8_LOGIN_MFA_README.md
  INDEX_STEP8_PATCH.txt

No existing application files are deleted by this patch.
