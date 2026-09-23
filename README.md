# OrgFlow Pro V2 — GitHub Pages + Supabase

ระบบสร้างและจัดการผังองค์กรบนเว็บ โดย GitHub Pages เป็น Frontend และ Supabase PostgreSQL เป็นฐานข้อมูลหลัก

## Architecture

```text
Browser
  ↓
GitHub Pages / index.html
  ↓
OrgFlow JavaScript
  ├─ Demo/Local mode (ไม่ต้องมีฐานข้อมูล)
  └─ Supabase Auth → PostgreSQL
                         └─ org_employees
```

Excel/CSV ใช้สำหรับ Import/Export เท่านั้น ไม่ใช่ฐานข้อมูลหลัก

## 1. Deploy to GitHub Pages

1. Upload/Push ไฟล์ทั้งหมดในโฟลเดอร์นี้เข้า repository `OrgFlow-Pro` ที่ branch `main`
2. ไปที่ GitHub → Settings → Pages
3. ตั้ง **Build and deployment → Source = GitHub Actions**
4. ไปที่ Actions และรอ workflow `Deploy OrgFlow Pro to GitHub Pages` สำเร็จ
5. เปิด `https://<username>.github.io/OrgFlow-Pro/`

> ใช้ path แบบ relative ทั้งหมด จึงทำงานกับ Project Pages ที่มี `/OrgFlow-Pro/` ได้

## 2. Configure Supabase

เปิด `js/config.js` และใส่ค่า:

```js
window.ORG_FLOW_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLISHABLE_OR_ANON_KEY',
  AUTO_LOAD_CLOUD: true
};
```

ห้ามใส่ `service_role` หรือ secret key ใน GitHub/frontend

## 3. Create database

เปิด Supabase → SQL Editor แล้วรัน `supabase/schema.sql`

## 4. Create login user

Supabase → Authentication → Users → Add user

ตัวอย่าง:

`admin@company.co.th`

## 5. How storage works

- ยังไม่ตั้งค่า Supabase: โปรแกรมเปิด Demo/Local mode และเก็บการแก้ไขใน browser LocalStorage
- ตั้งค่า Supabase แต่ยังไม่ Login: โปรแกรมยังเปิดดู Demo ได้ แต่ยังไม่เขียนข้อมูลขึ้น cloud
- Login สำเร็จ: โปรแกรมโหลดข้อมูลจาก `org_employees` และ Add/Edit/Delete/Import/Clear จะ sync ไป Supabase
- Excel/CSV: Import/Export เท่านั้น

## 6. Security

RLS ใน `supabase/schema.sql` อนุญาตเฉพาะ `authenticated` users ให้ CRUD ตาราง `org_employees`

สำหรับ production แบบหลายบริษัท ควรเพิ่ม `company_id` และ policies แบบ tenant-scoped ก่อนนำข้อมูลพนักงานจริงขึ้นระบบ
