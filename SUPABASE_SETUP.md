# Supabase Setup — OrgFlow Pro V2

## A. Create project
สร้าง Project ใน Supabase

## B. Database
Supabase → SQL Editor → New query → วาง `supabase/schema.sql` → Run

## C. Auth
Authentication → Users → Add user → สร้าง email/password สำหรับ HR/Admin

## D. Frontend config
แก้ `js/config.js`:

```js
window.ORG_FLOW_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'xxxxxxxx',
  AUTO_LOAD_CLOUD: true
};
```

ใช้ publishable/anon key เท่านั้น ห้ามใช้ service_role/secret key

## E. Test
1. เปิด GitHub Pages
2. กด Login
3. Login ด้วย Supabase user
4. เพิ่ม/แก้ไขพนักงาน
5. เปิด Supabase → Table Editor → `org_employees` ตรวจสอบข้อมูล
