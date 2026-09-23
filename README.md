# OrgFlow Pro — GitHub Pages + Supabase

เวอร์ชันนี้เปลี่ยนจาก **LocalStorage / Excel เป็นที่จัดเก็บหลัก** มาเป็น:

- Frontend: GitHub Pages (HTML/CSS/JavaScript)
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth (Email + Password)
- Security: Supabase Row Level Security (RLS)
- Excel/CSV: ใช้เป็น **Import / Export เท่านั้น** ไม่ใช่ฐานข้อมูล

## 1. สร้าง Supabase Project

1. เข้า Supabase Dashboard: https://supabase.com/dashboard
2. สร้าง Project ใหม่
3. เปิด SQL Editor
4. นำไฟล์ `supabase/schema.sql` ไปวางและ Run
5. ไปที่ Authentication > Users
6. สร้างผู้ใช้งาน เช่น `admin@company.com` พร้อม password

> ห้ามใช้ `service_role` key ในหน้าเว็บหรือ commit ลง GitHub

## 2. ใส่ Supabase URL และ Publishable/Anon Key

แก้ไฟล์:

`js/config.js`

ตัวอย่าง:

```js
window.ORG_FLOW_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xxxxxxxxx"
};
```

สามารถใช้ publishable key / anon key สำหรับ browser ได้ แต่ต้องเปิด RLS และกำหนด policy ให้ถูกต้อง

## 3. ทดสอบบนเครื่อง

เปิดผ่าน local web server เช่น VS Code Live Server

ห้ามเปิดด้วย `file://` หากต้องการทดสอบ Auth/Cloud แบบจริงจัง

## 4. Deploy GitHub Pages

สร้าง repository เช่น:

`orgflow-pro`

แล้ว push ไฟล์ทั้งหมดขึ้น GitHub

จากนั้น:

`Repository > Settings > Pages`

เลือก:

- Source: GitHub Actions

Workflow ใน:

`.github/workflows/pages.yml`

จะ deploy ทุกครั้งที่ push `main`

URL จะอยู่รูปแบบ:

`https://YOUR-USERNAME.github.io/orgflow-pro/`

## 5. สิ่งที่เปลี่ยนจากรุ่น Offline

### เดิม

`Excel -> JavaScript -> LocalStorage`

### รุ่นใหม่

`Browser -> Supabase Auth -> Supabase PostgreSQL`

ข้อมูลพนักงานจะไม่ถูกเก็บเป็น Excel หรือ LocalStorage เป็นฐานข้อมูลหลัก

## 6. โครงสร้างข้อมูล

ตารางหลัก:

`public.org_employees`

ฟิลด์:

- id
- name
- position
- department
- reports_to
- role_level
- email
- phone
- avatar_url
- created_at
- updated_at

## 7. ความปลอดภัย

ตาราง `org_employees` เปิด RLS และอนุญาตเฉพาะ `authenticated` users

ห้ามสร้าง policy แบบ:

`to anon using (true)`

สำหรับข้อมูลพนักงานจริง

ห้ามใส่:

`service_role`

หรือ Secret Key ใน `js/config.js`

## 8. Excel ยังอยู่ไหม?

ยังอยู่เพื่อรองรับการย้ายข้อมูล:

- Import Excel / CSV -> บันทึกเข้า Supabase
- Export Excel -> ส่งออกข้อมูลจากระบบ
- Template Excel -> ใช้เตรียมข้อมูลก่อน Import

แต่ Excel **ไม่ใช่ storage หลักอีกต่อไป**

## 9. แผนต่อยอดที่แนะนำ

Phase 2:

- Multi-company / Tenant
- User roles: Owner / HR Admin / Manager / Viewer
- Audit Log
- Realtime update
- Department master
- Position master
- Employee master
- Profile photo upload ไป Supabase Storage
- Version / History ของ Organization Chart
- แชร์ลิงก์เฉพาะสิทธิ์
- Custom domain เช่น `org.company.co.th`

