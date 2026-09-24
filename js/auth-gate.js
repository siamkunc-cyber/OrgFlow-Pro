/**
 * Siamhrbp OrgFlow-Pro — Authentication Gate
 * STEP 8.4
 *
 * MFA business rule:
 *   1) Normal login: Email + Password only.
 *   2) Count consecutive password failures per email.
 *   3) After MORE THAN 5 consecutive failures (6th failed attempt reached),
 *      MFA is required ONLY for SUPER_ADMIN.
 *   4) HR_ADMIN / EMPLOYEE never enter the MFA flow.
 *   5) After successful Super Admin MFA, the failure counter is reset.
 *
 * IMPORTANT:
 * Browser-side failure counters are UX/business-flow enforcement only.
 * Supabase Auth's own server-side rate limits remain the real protection.
 * For tamper-resistant enforcement, use the optional SQL/RPC package included
 * in STEP8.4-MFA-RULE.sql.
 */
(function () {
  'use strict';

  const APP_NAME = 'Siamhrbp OrgFlow-Pro';
  const MFA_THRESHOLD = 5; // MFA activates after >5 consecutive failures.
  const ATTEMPT_KEY = 'siamhrbp_orgflow_auth_attempts_v84';
  let busy = false;
  let factorId = null;
  let profile = null;

  const service = () => window.OrgFlowSupabaseService || null;
  const client = () => service()?.client || null;

  function configured() {
    const s = service();
    return !!(s?.isConfigured?.() && s?.client);
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[c]));
  }

  function getAttemptMap() {
    try { return JSON.parse(localStorage.getItem(ATTEMPT_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function getAttempts(email) {
    return Number(getAttemptMap()[email.toLowerCase()] || 0);
  }

  function setAttempts(email, n) {
    const map = getAttemptMap();
    const key = email.toLowerCase();
    if (n <= 0) delete map[key]; else map[key] = n;
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(map));
  }

  function addFailure(email) {
    const n = getAttempts(email) + 1;
    setAttempts(email, n);
    return n;
  }

  function resetFailures(email) {
    setAttempts(email, 0);
  }

  function lockScreen(on) {
    document.documentElement.classList.toggle('siam-auth-locked', on);
    document.body.classList.toggle('siam-auth-locked', on);
    const g = document.getElementById('siamhrbp-auth-gate');
    if (g) g.classList.toggle('siam-hidden', !on);
  }

  function ensureStyles() {
    if (document.getElementById('siamhrbp-auth-style')) return;
    const s = document.createElement('style');
    s.id = 'siamhrbp-auth-style';
    s.textContent = `
      html.siam-auth-locked,body.siam-auth-locked{overflow:hidden!important}
      #siamhrbp-auth-gate{position:fixed;inset:0;z-index:100000;display:flex;background:#080f20;color:#eef5ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
      #siamhrbp-auth-gate.siam-hidden{display:none!important}
      .siam-left{position:relative;flex:1 1 52%;overflow:hidden;display:flex;align-items:center;padding:clamp(28px,5vw,72px);background:radial-gradient(circle at 18% 20%,rgba(72,164,255,.34),transparent 34%),radial-gradient(circle at 82% 78%,rgba(130,72,255,.25),transparent 34%),linear-gradient(135deg,#071326,#102c55 48%,#071021)}
      .siam-left:after{content:"";position:absolute;width:55vw;height:55vw;right:-24vw;bottom:-28vw;border-radius:50%;border:1px solid rgba(255,255,255,.12);box-shadow:0 0 0 80px rgba(255,255,255,.025),0 0 0 160px rgba(255,255,255,.018)}
      .siam-hero{position:relative;z-index:2;max-width:650px}.siam-brand{display:flex;align-items:center;gap:14px;margin-bottom:28px}.siam-mark{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#fff;color:#071326;font-weight:900}.siam-name{font-size:22px;font-weight:800}.siam-sub{color:#c5d8ef;font-size:13px}.siam-title{font-size:clamp(34px,4.6vw,66px);line-height:1.08;margin:0 0 18px;font-weight:850;letter-spacing:-.045em}.siam-title span{color:#8dccff}.siam-copy{color:#c6d5e8;font-size:15px;line-height:1.8}.siam-cards{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap}.siam-card{min-width:145px;padding:14px 16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:15px}.siam-card strong{display:block;font-size:13px}.siam-card small{color:#a9bdd6}.siam-footer{position:absolute;left:28px;right:28px;bottom:18px;color:#72849d;font-size:10px;text-align:center}
      .siam-right{flex:0 0 min(48%,760px);display:flex;align-items:center;justify-content:center;padding:28px;background:#070c18;border-left:1px solid rgba(255,255,255,.06)}.siam-shell{width:min(460px,100%)}.siam-tools{display:flex;justify-content:flex-end;gap:8px;margin-bottom:28px}.siam-icon{width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#10192c;color:#dce8f8}.siam-h2{font-size:34px;font-weight:800;margin:0 0 8px}.siam-p{color:#9eb0c9;font-size:13px;line-height:1.7;margin-bottom:28px}.siam-field{margin-bottom:17px}.siam-label{display:block;color:#d8e5f5;font-size:12px;font-weight:700;margin-bottom:8px}.siam-wrap{position:relative}.siam-input{width:100%;box-sizing:border-box;height:52px;border-radius:13px;border:1px solid #26344d;background:#edf4ff;color:#101827;padding:0 46px;font-size:14px;outline:none}.siam-input:focus{border-color:#2f80ed;box-shadow:0 0 0 3px rgba(47,128,237,.2)}.siam-ico{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#8a9bb3}.siam-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:transparent;color:#72839b;cursor:pointer}.siam-btn{width:100%;height:52px;border:0;border-radius:13px;margin-top:7px;background:linear-gradient(135deg,#fff,#e8f2ff);color:#091326;font-size:14px;font-weight:800;cursor:pointer}.siam-btn:disabled{opacity:.55}.siam-back{width:100%;margin-top:10px;height:44px;border-radius:12px;border:1px solid #26344d;background:transparent;color:#b8c8dc;cursor:pointer}.siam-msg{margin:0 0 16px;padding:11px 13px;border-radius:12px;font-size:12px;line-height:1.55}.siam-error{border:1px solid rgba(255,98,98,.25);background:rgba(150,35,35,.14);color:#ffb1b1}.siam-ok{border:1px solid rgba(71,210,151,.22);background:rgba(24,115,82,.13);color:#9af0c9}.siam-info{margin-top:22px;padding:15px 16px;border:1px solid rgba(84,153,255,.16);background:rgba(20,42,75,.28);border-radius:14px;color:#9fb6d3;font-size:11px;line-height:1.65}.siam-qr{display:block;width:210px;height:210px;margin:0 auto 18px;background:#fff;padding:10px;border-radius:14px}.siam-secret{font-family:ui-monospace,monospace;word-break:break-all;color:#b8d5f4;background:#0d1627;border:1px solid #25334b;padding:10px 12px;border-radius:10px;font-size:11px}.siam-code{letter-spacing:.35em;text-align:center;font-size:22px;font-weight:800;padding-left:22px}
      @media(max-width:900px){#siamhrbp-auth-gate{overflow:auto}.siam-left{display:none}.siam-right{flex:1;min-height:100%;border-left:0}}
    `;
    document.head.appendChild(s);
  }

  function ensureGate() {
    let g = document.getElementById('siamhrbp-auth-gate');
    if (g) return g;
    g = document.createElement('div');
    g.id = 'siamhrbp-auth-gate';
    g.innerHTML = `
      <section class="siam-left"><div class="siam-hero">
        <div class="siam-brand"><div class="siam-mark">S</div><div><div class="siam-name">${APP_NAME}</div><div class="siam-sub">Integrated Organization & People Management</div></div></div>
        <h1 class="siam-title">บริหารคน <span>พัฒนาองค์กร</span><br>ในระบบเดียว</h1>
        <p class="siam-copy">ระบบจัดการโครงสร้างองค์กรสำหรับ HR และผู้บริหาร เชื่อมต่อ Supabase พร้อมสิทธิ์การใช้งานตามบทบาท และการรักษาความปลอดภัยตามนโยบายองค์กร</p>
        <div class="siam-cards"><div class="siam-card"><strong>HRM</strong><small>บริหารทรัพยากรบุคคล</small></div><div class="siam-card"><strong>HRD</strong><small>พัฒนาบุคลากร</small></div><div class="siam-card"><strong>HROD</strong><small>พัฒนาองค์กร</small></div></div>
      </div><div class="siam-footer">©2026 siamhrbp Organization • Secure Authentication</div></section>
      <section class="siam-right"><div class="siam-shell"><div class="siam-tools"><button class="siam-icon" type="button">⚙</button><button class="siam-icon" type="button">☾</button></div><div id="siam-auth-content"></div></div></section>`;
    document.body.appendChild(g);
    return g;
  }

  function renderLogin(message = '') {
    const root = document.getElementById('siam-auth-content');
    if (!root) return;
    root.innerHTML = `
      <h2 class="siam-h2">เข้าสู่ระบบ</h2>
      <p class="siam-p">ใช้บัญชีพนักงานหรือผู้ใช้ที่ได้รับอนุญาตจากฝ่ายทรัพยากรบุคคล</p>
      ${message ? `<div class="siam-msg siam-error">${esc(message)}</div>` : ''}
      <form id="siam-login-form">
        <div class="siam-field"><label class="siam-label">อีเมล / ชื่อผู้ใช้</label><div class="siam-wrap"><span class="siam-ico">◯</span><input id="siam-email" class="siam-input" type="email" autocomplete="username" placeholder="name@company.com" required></div></div>
        <div class="siam-field"><label class="siam-label">รหัสผ่าน</label><div class="siam-wrap"><span class="siam-ico">●</span><input id="siam-password" class="siam-input" type="password" autocomplete="current-password" required><button class="siam-eye" id="siam-eye" type="button">◉</button></div></div>
        <button class="siam-btn" id="siam-login-btn" type="submit">→ &nbsp; เข้าสู่ระบบ</button>
      </form>
      <div class="siam-info">🛡 ระบบจะเปิด MFA เฉพาะ <b>SUPER_ADMIN</b> เมื่อมีการกรอกรหัสผ่านผิดติดต่อกันเกิน 5 ครั้ง</div>`;
    const pass = document.getElementById('siam-password');
    document.getElementById('siam-eye')?.addEventListener('click', () => {
      const on = pass.type === 'text'; pass.type = on ? 'password' : 'text';
      document.getElementById('siam-eye').textContent = on ? '◉' : '◎';
    });
    document.getElementById('siam-login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await loginAttempt(document.getElementById('siam-email').value.trim(), pass.value);
    });
  }

  function renderLoading(title, text) {
    const root = document.getElementById('siam-auth-content');
    if (root) root.innerHTML = `<h2 class="siam-h2">${esc(title)}</h2><p class="siam-p">${esc(text)}</p><div class="siam-info">กรุณารอสักครู่...</div>`;
  }

  function renderMfaChallenge() {
    const root = document.getElementById('siam-auth-content');
    root.innerHTML = `
      <h2 class="siam-h2">ยืนยันตัวตนขั้นที่ 2</h2>
      <p class="siam-p">บัญชี SUPER_ADMIN มีการกรอกรหัสผ่านผิดติดต่อกันเกิน 5 ครั้ง จึงต้องยืนยันด้วย Authenticator</p>
      <div class="siam-field"><label class="siam-label">รหัส 6 หลักจาก Authenticator</label><input id="siam-mfa-code" class="siam-input siam-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></div>
      <div id="siam-mfa-msg"></div>
      <button class="siam-btn" id="siam-mfa-submit" type="button">✓ ยืนยันและเข้าใช้งาน</button>
      <button class="siam-back" id="siam-mfa-logout" type="button">ออกจากระบบ</button>`;
    document.getElementById('siam-mfa-submit').addEventListener('click', verifyMfa);
    document.getElementById('siam-mfa-logout').addEventListener('click', async () => { await logout(); renderLogin(); });
  }

  function renderEnrollment(qr, secret) {
    const root = document.getElementById('siam-auth-content');
    const qrSrc = qr?.startsWith('data:') ? qr : (qr ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qr) : '');
    root.innerHTML = `
      <h2 class="siam-h2">ตั้งค่า MFA สำหรับ SUPER_ADMIN</h2>
      <p class="siam-p">สแกน QR ด้วย Google Authenticator / Microsoft Authenticator แล้วกรอกรหัส 6 หลัก</p>
      ${qrSrc ? `<img class="siam-qr" src="${qrSrc}" alt="MFA QR Code">` : '<div class="siam-msg siam-error">Supabase ไม่ได้ส่ง QR Code กลับมา</div>'}
      <div class="siam-field"><label class="siam-label">Secret Key สำรอง</label><div class="siam-secret">${esc(secret || 'ไม่พบ Secret')}</div></div>
      <div class="siam-field"><label class="siam-label">รหัส 6 หลัก</label><input id="siam-enroll-code" class="siam-input siam-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></div>
      <div id="siam-mfa-msg"></div>
      <button class="siam-btn" id="siam-enroll-submit" type="button">✓ ยืนยัน MFA และเข้าใช้งาน</button>
      <button class="siam-back" id="siam-enroll-logout" type="button">ออกจากระบบ</button>`;
    document.getElementById('siam-enroll-submit').addEventListener('click', verifyEnrollment);
    document.getElementById('siam-enroll-logout').addEventListener('click', async () => { await logout(); renderLogin(); });
  }

  function mfaError(msg) {
    const el = document.getElementById('siam-mfa-msg');
    if (el) el.innerHTML = `<div class="siam-msg siam-error">${esc(msg)}</div>`;
  }

  async function logout() {
    try { await service().signOut(); } catch (e) { console.warn(e); }
    factorId = null; profile = null; busy = false;
  }

  async function loginAttempt(email, password) {
    if (busy) return;
    if (!configured()) { renderLogin('ยังไม่ได้ตั้งค่า Supabase ใน js/config.js'); return; }
    if (!email || !password) return;

    busy = true;
    renderLoading('กำลังตรวจสอบบัญชี', 'กำลังตรวจสอบอีเมลและรหัสผ่าน...');
    try {
      await service().signIn(email, password);

      // Password is correct. Determine role before deciding whether MFA applies.
      profile = await service().getCurrentProfile();
      const failures = getAttempts(email);

      if (profile.role === 'SUPER_ADMIN' && failures > MFA_THRESHOLD) {
        await startSuperAdminMfa();
        return;
      }

      // HR_ADMIN / EMPLOYEE never enter MFA.
      resetFailures(email);
      await finish();
    } catch (err) {
      console.error('[STEP8.4 login]', err);
      try { await service().signOut(); } catch {}
      const failures = addFailure(email);
      busy = false;

      if (failures > MFA_THRESHOLD) {
        renderLogin('รหัสผ่านไม่ถูกต้องติดต่อกันเกิน 5 ครั้งแล้ว หากบัญชีเป็น SUPER_ADMIN การเข้าสู่ระบบครั้งถัดไปจะต้องผ่าน MFA');
      } else {
        renderLogin(`เข้าสู่ระบบไม่สำเร็จ: ${err?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'} (ครั้งที่ ${failures}/5)`);
      }
    }
  }

  async function startSuperAdminMfa() {
    const c = client();
    if (!c) throw new Error('ไม่พบ Supabase client');

    const { data: factors, error } = await c.auth.mfa.listFactors();
    if (error) throw error;

    const verified = (factors?.totp || []).find(f => f.status === 'verified');
    if (verified) {
      factorId = verified.id;
      busy = false;
      renderMfaChallenge();
      return;
    }

    // First MFA activation for SUPER_ADMIN.
    const stale = (factors?.totp || []).filter(f => f.status === 'unverified');
    for (const f of stale) {
      try { await c.auth.mfa.unenroll({ factorId: f.id }); } catch (e) { console.warn(e); }
    }

    const { data, error: enrollError } = await c.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: APP_NAME + ' SUPER_ADMIN'
    });
    if (enrollError) throw enrollError;

    factorId = data.id;
    busy = false;
    renderEnrollment(data?.totp?.qr_code || '', data?.totp?.secret || '');
  }

  async function verifyEnrollment() {
    const code = document.getElementById('siam-enroll-code')?.value.trim();
    if (!/^\d{6}$/.test(code || '')) { mfaError('กรุณากรอกรหัส 6 หลัก'); return; }
    try {
      const c = client();
      const { data: ch, error: ce } = await c.auth.mfa.challenge({ factorId });
      if (ce) throw ce;
      const { error: ve } = await c.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (ve) throw ve;
      const email = service().getUser()?.email || '';
      resetFailures(email);
      await finish();
    } catch (e) {
      console.error('[STEP8.4 enroll]', e);
      mfaError(e?.message || 'ยืนยัน MFA ไม่สำเร็จ');
    }
  }

  async function verifyMfa() {
    const code = document.getElementById('siam-mfa-code')?.value.trim();
    if (!/^\d{6}$/.test(code || '')) { mfaError('กรุณากรอกรหัส 6 หลัก'); return; }
    try {
      const c = client();
      const { data: ch, error: ce } = await c.auth.mfa.challenge({ factorId });
      if (ce) throw ce;
      const { error: ve } = await c.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (ve) throw ve;
      const email = service().getUser()?.email || '';
      resetFailures(email);
      await finish();
    } catch (e) {
      console.error('[STEP8.4 challenge]', e);
      mfaError(e?.message || 'รหัส MFA ไม่ถูกต้อง');
    }
  }

  async function finish() {
    const c = client();
    const { data: aal, error } = await c.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (profile?.role === 'SUPER_ADMIN' && aal?.currentLevel !== 'aal2') throw new Error('MFA ยังไม่ผ่าน AAL2');
    if (!profile) profile = await service().getCurrentProfile();
    if (!profile || profile.is_active !== true) throw new Error('ไม่พบ User Profile ที่ใช้งานได้');

    busy = false;
    lockScreen(false);
    document.title = APP_NAME + ' | Organization Management';
    window.dispatchEvent(new CustomEvent('siamhrbp-auth-ready', { detail: { profile } }));
  }

  async function init() {
    ensureStyles(); ensureGate(); lockScreen(true);
    if (!configured()) { renderLogin('ยังไม่ได้ตั้งค่า Supabase URL / Publishable Key'); return; }

    const c = client();
    // Passive listener only. It never starts or cancels MFA.
    c.auth.onAuthStateChange((event) => console.debug('[Siamhrbp Auth]', event));

    const { data, error } = await c.auth.getSession();
    if (error) { renderLogin(error.message); return; }

    if (data?.session) {
      try {
        profile = await service().getCurrentProfile();
        // Existing authenticated sessions do not retroactively trigger MFA.
        // MFA is evaluated only after a new password login crosses the threshold.
        await finish();
      } catch (e) {
        await logout();
        renderLogin(e?.message || 'เซสชันไม่สามารถยืนยันได้');
      }
    } else {
      renderLogin();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
