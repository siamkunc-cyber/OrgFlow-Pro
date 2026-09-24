/**
 * Siamhrbp OrgFlow-Pro — Authentication Gate
 * STEP 8: Production Login + Supabase TOTP MFA
 *
 * Requirements:
 *   - Supabase Auth Email/Password
 *   - Supabase TOTP MFA (second step)
 *   - No Demo/Local access when Supabase is configured
 *   - Password show/hide
 *   - 5 failed attempts -> short client-side cooldown
 *
 * IMPORTANT:
 * This is a UI gate. Supabase Auth + RLS remain the security boundary.
 * Do not put a service_role/secret key in the browser.
 */
(function () {
  'use strict';

  const APP_NAME = 'Siamhrbp OrgFlow-Pro';
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 60 * 1000;
  const MFA_FRIENDLY_NAME = 'Siamhrbp OrgFlow-Pro';

  let failedAttempts = 0;
  let lockedUntil = 0;
  let currentFactorId = null;
  let currentChallengeId = null;
  let pendingEnrollment = null;

  function svc() {
    return window.OrgFlowSupabaseService || null;
  }

  function client() {
    return svc()?.client || null;
  }

  function isConfigured() {
    const s = svc();
    return !!(s && s.isConfigured && s.isConfigured());
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
  }

  function injectStyles() {
    if (document.getElementById('siamhrbp-login-style')) return;
    const style = document.createElement('style');
    style.id = 'siamhrbp-login-style';
    style.textContent = `
      :root {
        --siam-navy:#080f20;
        --siam-navy-2:#0d1730;
        --siam-blue:#2f80ed;
        --siam-cyan:#55b8ff;
        --siam-text:#eef5ff;
        --siam-muted:#9eb0c9;
        --siam-line:rgba(255,255,255,.10);
      }
      #siamhrbp-auth-gate {
        position:fixed; inset:0; z-index:100000;
        display:flex; background:var(--siam-navy);
        color:var(--siam-text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
      }
      #siamhrbp-auth-gate.siam-hidden { display:none !important; }
      .siam-auth-left {
        position:relative; flex:1 1 52%; min-width:0; overflow:hidden;
        display:flex; align-items:center; padding:clamp(28px,5vw,72px);
        background:
          radial-gradient(circle at 18% 20%,rgba(72,164,255,.34),transparent 34%),
          radial-gradient(circle at 82% 78%,rgba(130,72,255,.25),transparent 34%),
          linear-gradient(135deg,#071326 0%,#102c55 48%,#071021 100%);
      }
      .siam-auth-left:before {
        content:""; position:absolute; inset:-15%;
        background:
          linear-gradient(20deg,transparent 0 36%,rgba(255,255,255,.055) 36.5% 43%,transparent 43.5%),
          linear-gradient(-18deg,transparent 0 52%,rgba(46,128,237,.12) 52.5% 61%,transparent 61.5%);
        transform:rotate(-4deg);
      }
      .siam-auth-left:after {
        content:""; position:absolute; width:55vw; height:55vw; right:-24vw; bottom:-28vw;
        border-radius:50%; border:1px solid rgba(255,255,255,.12);
        box-shadow:0 0 0 80px rgba(255,255,255,.025),0 0 0 160px rgba(255,255,255,.018);
      }
      .siam-hero-content { position:relative; z-index:2; max-width:650px; }
      .siam-brand { display:flex; align-items:center; gap:14px; margin-bottom:28px; }
      .siam-brand-mark {
        width:48px; height:48px; border-radius:15px; display:grid; place-items:center;
        background:linear-gradient(135deg,#fff,#d9ebff); color:#071326; font-weight:900;
        box-shadow:0 12px 30px rgba(0,0,0,.25);
      }
      .siam-brand-name { font-size:22px; font-weight:800; letter-spacing:-.02em; }
      .siam-brand-sub { color:#c5d8ef; font-size:13px; margin-top:2px; }
      .siam-hero-title { font-size:clamp(34px,4.6vw,66px); line-height:1.08; margin:0 0 18px; font-weight:850; letter-spacing:-.045em; }
      .siam-hero-title span { color:#8dccff; }
      .siam-hero-copy { color:#c6d5e8; font-size:15px; line-height:1.8; max-width:600px; }
      .siam-hero-cards { display:flex; gap:12px; margin-top:30px; flex-wrap:wrap; }
      .siam-hero-card {
        min-width:145px; padding:14px 16px; border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.08); border-radius:15px; backdrop-filter:blur(10px);
      }
      .siam-hero-card strong { display:block; font-size:13px; }
      .siam-hero-card small { display:block; color:#a9bdd6; margin-top:4px; font-size:11px; }
      .siam-auth-right {
        flex:0 0 min(48%,760px); display:flex; align-items:center; justify-content:center;
        padding:28px; background:linear-gradient(180deg,#090f1f,#070c18);
        border-left:1px solid rgba(255,255,255,.06);
      }
      .siam-login-shell { width:min(460px,100%); }
      .siam-login-top { display:flex; justify-content:flex-end; gap:8px; margin-bottom:28px; }
      .siam-icon-btn { width:38px; height:38px; border-radius:12px; border:1px solid var(--siam-line); background:#10192c; color:#dce8f8; cursor:pointer; }
      .siam-login-title { font-size:34px; font-weight:800; margin:0 0 8px; letter-spacing:-.03em; }
      .siam-login-sub { color:var(--siam-muted); font-size:13px; line-height:1.7; margin-bottom:28px; }
      .siam-field { margin-bottom:17px; }
      .siam-label { display:block; color:#d8e5f5; font-size:12px; font-weight:700; margin-bottom:8px; }
      .siam-input-wrap { position:relative; }
      .siam-input {
        width:100%; box-sizing:border-box; height:52px; border-radius:13px;
        border:1px solid #26344d; background:#edf4ff; color:#101827;
        padding:0 46px 0 45px; font-size:14px; outline:none;
        transition:.18s ease; box-shadow:0 0 0 0 rgba(47,128,237,0);
      }
      .siam-input:focus { border-color:#2f80ed; box-shadow:0 0 0 3px rgba(47,128,237,.20); }
      .siam-input-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#8a9bb3; }
      .siam-toggle {
        position:absolute; right:8px; top:50%; transform:translateY(-50%);
        width:36px; height:36px; border:0; border-radius:10px; background:transparent;
        color:#72839b; cursor:pointer;
      }
      .siam-toggle:hover { background:#dbe8f7; color:#1f4f86; }
      .siam-submit {
        width:100%; height:52px; border:0; border-radius:13px; margin-top:7px;
        background:linear-gradient(135deg,#fff,#e8f2ff); color:#091326; font-size:14px;
        font-weight:800; cursor:pointer; box-shadow:0 12px 28px rgba(0,0,0,.22);
      }
      .siam-submit:hover { filter:brightness(.97); transform:translateY(-1px); }
      .siam-submit:disabled { opacity:.55; cursor:not-allowed; transform:none; }
      .siam-info-box {
        margin-top:22px; padding:15px 16px; border:1px solid rgba(84,153,255,.16);
        background:rgba(20,42,75,.28); border-radius:14px; color:#9fb6d3; font-size:11px; line-height:1.65;
      }
      .siam-error { margin:0 0 16px; padding:11px 13px; border:1px solid rgba(255,98,98,.25); background:rgba(150,35,35,.14); color:#ffb1b1; border-radius:12px; font-size:12px; line-height:1.55; }
      .siam-success { margin:0 0 16px; padding:11px 13px; border:1px solid rgba(71,210,151,.22); background:rgba(24,115,82,.13); color:#9af0c9; border-radius:12px; font-size:12px; line-height:1.55; }
      .siam-mfa-code { letter-spacing:.35em; text-align:center; font-size:22px; font-weight:800; padding-left:22px; }
      .siam-back { width:100%; margin-top:10px; height:44px; border-radius:12px; border:1px solid #26344d; background:transparent; color:#b8c8dc; cursor:pointer; }
      .siam-back:hover { background:#111b2e; }
      .siam-qr {
        display:block; width:180px; height:180px; margin:0 auto 15px; background:white; padding:10px; border-radius:14px;
      }
      .siam-secret { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; word-break:break-all; color:#b8d5f4; background:#0d1627; border:1px solid #25334b; padding:10px 12px; border-radius:10px; font-size:11px; }
      .siam-footer { position:absolute; left:28px; right:28px; bottom:18px; color:#72849d; font-size:10px; text-align:center; }
      @media (max-width: 900px) {
        #siamhrbp-auth-gate { overflow:auto; }
        .siam-auth-left { display:none; }
        .siam-auth-right { flex:1; min-height:100%; border-left:0; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGate() {
    if (document.getElementById('siamhrbp-auth-gate')) return document.getElementById('siamhrbp-auth-gate');
    const gate = document.createElement('div');
    gate.id = 'siamhrbp-auth-gate';
    gate.innerHTML = `
      <section class="siam-auth-left" aria-hidden="true">
        <div class="siam-hero-content">
          <div class="siam-brand">
            <div class="siam-brand-mark">S</div>
            <div>
              <div class="siam-brand-name">Siamhrbp OrgFlow-Pro</div>
              <div class="siam-brand-sub">Integrated Organization & People Management</div>
            </div>
          </div>
          <h1 class="siam-hero-title">บริหารคน <span>พัฒนาองค์กร</span><br>ในระบบเดียว</h1>
          <p class="siam-hero-copy">
            ระบบจัดการโครงสร้างองค์กรสำหรับ HR และผู้บริหาร
            เชื่อมต่อ Supabase พร้อมสิทธิ์การใช้งานตามบทบาท
            และยืนยันตัวตน 2 ขั้นตอนด้วย Authenticator
          </p>
          <div class="siam-hero-cards">
            <div class="siam-hero-card"><strong>HRM</strong><small>บริหารทรัพยากรบุคคล</small></div>
            <div class="siam-hero-card"><strong>HRD</strong><small>พัฒนาบุคลากร</small></div>
            <div class="siam-hero-card"><strong>HROD</strong><small>พัฒนาองค์กร</small></div>
          </div>
        </div>
        <div class="siam-footer">©2026 siamhrbp Organization • PDPA Ready • Secure Authentication</div>
      </section>

      <section class="siam-auth-right">
        <div class="siam-login-shell">
          <div class="siam-login-top">
            <button class="siam-icon-btn" type="button" title="ธีม">⚙</button>
            <button class="siam-icon-btn" type="button" title="โหมดมืด">☾</button>
          </div>
          <div id="siam-auth-content"></div>
        </div>
      </section>
    `;
    document.body.appendChild(gate);
    return gate;
  }

  function setLocked(locked) {
    document.documentElement.classList.toggle('siam-auth-locked', locked);
    document.body.classList.toggle('siam-auth-locked', locked);
    const gate = document.getElementById('siamhrbp-auth-gate');
    if (gate) gate.classList.toggle('siam-hidden', !locked);
  }

  function renderLogin(message = '', success = false) {
    const root = document.getElementById('siam-auth-content');
    if (!root) return;
    root.innerHTML = `
      <h2 class="siam-login-title">เข้าสู่ระบบ</h2>
      <p class="siam-login-sub">ใช้บัญชีพนักงานหรือผู้ใช้ที่ได้รับอนุญาตจากฝ่ายทรัพยากรบุคคล</p>
      ${message ? `<div class="${success ? 'siam-success' : 'siam-error'}">${escapeHtml(message)}</div>` : ''}
      <form id="siam-login-form" autocomplete="on">
        <div class="siam-field">
          <label class="siam-label" for="siam-email">อีเมล / ชื่อผู้ใช้</label>
          <div class="siam-input-wrap">
            <span class="siam-input-icon">◯</span>
            <input id="siam-email" class="siam-input" type="email" autocomplete="username" placeholder="name@company.com" required />
          </div>
        </div>
        <div class="siam-field">
          <label class="siam-label" for="siam-password">รหัสผ่าน</label>
          <div class="siam-input-wrap">
            <span class="siam-input-icon">●</span>
            <input id="siam-password" class="siam-input" type="password" autocomplete="current-password" placeholder="••••••••••••" required />
            <button class="siam-toggle" type="button" id="siam-password-toggle" title="แสดง/ซ่อนรหัสผ่าน">◉</button>
          </div>
        </div>
        <button class="siam-submit" id="siam-login-submit" type="submit">→ &nbsp; เข้าสู่ระบบ</button>
      </form>
      <div class="siam-info-box">🛡 ระบบบันทึกการเข้าใช้งาน (Audit Log) • ยืนยันตัวตน 2 ขั้นตอน (MFA/TOTP) • บัญชีต้องมี User Profile ในระบบ</div>
    `;
    const form = document.getElementById('siam-login-form');
    const pass = document.getElementById('siam-password');
    const toggle = document.getElementById('siam-password-toggle');
    toggle?.addEventListener('click', () => {
      const visible = pass.type === 'text';
      pass.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? '◉' : '◎';
    });
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      await firstFactor(document.getElementById('siam-email').value.trim(), pass.value);
    });
  }

  function renderLoading(title, text) {
    const root = document.getElementById('siam-auth-content');
    if (!root) return;
    root.innerHTML = `<h2 class="siam-login-title">${escapeHtml(title)}</h2><p class="siam-login-sub">${escapeHtml(text)}</p><div class="siam-info-box">กำลังตรวจสอบความปลอดภัย...</div>`;
  }

  async function firstFactor(email, password) {
    if (Date.now() < lockedUntil) {
      const remain = Math.ceil((lockedUntil - Date.now()) / 1000);
      renderLogin(`เข้าสู่ระบบถูกพักชั่วคราว กรุณารอ ${remain} วินาที`, false);
      return;
    }
    if (!email || !password) return;
    if (!isConfigured()) {
      renderLogin('ยังไม่ได้ตั้งค่า Supabase URL / Publishable Key ใน js/config.js', false);
      return;
    }
    renderLoading('กำลังเข้าสู่ระบบ', 'กำลังตรวจสอบบัญชีและรหัสผ่าน...');
    try {
      await svc().signIn(email, password);
      failedAttempts = 0;
      await continueAfterPassword();
    } catch (err) {
      failedAttempts += 1;
      if (failedAttempts >= MAX_ATTEMPTS) {
        lockedUntil = Date.now() + LOCK_MS;
        failedAttempts = 0;
        renderLogin('เข้าสู่ระบบผิดหลายครั้ง ระบบพักการเข้าสู่ระบบชั่วคราว 60 วินาที', false);
      } else {
        renderLogin(`เข้าสู่ระบบไม่สำเร็จ: ${err?.message || 'ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง'}<br>เหลือโอกาส ${MAX_ATTEMPTS - failedAttempts} ครั้ง`, false);
      }
    }
  }

  async function continueAfterPassword() {
    const c = client();
    if (!c) throw new Error('ไม่พบ Supabase client');

    // Ensure the account has an active application profile before exposing the app.
    await svc().getCurrentProfile();

    const { data: aal, error: aalError } = await c.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;

    if (aal?.currentLevel === 'aal2') {
      await finishAccess();
      return;
    }

    const { data: factors, error: factorsError } = await c.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const verifiedTotp = (factors?.totp || []).find(f => f.status === 'verified');
    if (verifiedTotp) {
      currentFactorId = verifiedTotp.id;
      await renderMfaChallenge();
      return;
    }

    // No verified factor: mandatory enrollment as the second step.
    await beginEnrollment();
  }

  async function beginEnrollment() {
    const c = client();
    renderLoading('ตั้งค่าการยืนยันตัวตน 2 ขั้นตอน', 'กำลังสร้าง Authenticator สำหรับบัญชีนี้...');
    const { data, error } = await c.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: MFA_FRIENDLY_NAME
    });
    if (error) throw error;
    pendingEnrollment = data;
    currentFactorId = data.id;

    const qr = data?.totp?.qr_code || '';
    const secret = data?.totp?.secret || '';
    const root = document.getElementById('siam-auth-content');
    root.innerHTML = `
      <h2 class="siam-login-title">ยืนยันตัวตน 2 ขั้นตอน</h2>
      <p class="siam-login-sub">สแกน QR นี้ด้วย Google Authenticator, Microsoft Authenticator หรือแอป TOTP ที่คุณใช้</p>
      ${qr ? `<img class="siam-qr" alt="TOTP QR Code" src="${qr.startsWith('data:') ? qr : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qr)}">` : ''}
      <div class="siam-field">
        <label class="siam-label">Secret Key สำรอง</label>
        <div class="siam-secret">${escapeHtml(secret)}</div>
      </div>
      <div class="siam-field">
        <label class="siam-label" for="siam-mfa-enroll-code">รหัส 6 หลักจาก Authenticator</label>
        <input id="siam-mfa-enroll-code" class="siam-input siam-mfa-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" />
      </div>
      <div id="siam-mfa-message"></div>
      <button class="siam-submit" id="siam-mfa-enroll-submit" type="button">✓ เปิดใช้งาน MFA</button>
      <button class="siam-back" id="siam-mfa-cancel" type="button">ออกจากระบบ</button>
    `;

    document.getElementById('siam-mfa-enroll-submit')?.addEventListener('click', verifyEnrollment);
    document.getElementById('siam-mfa-cancel')?.addEventListener('click', async () => {
      try { await svc().signOut(); } catch (_) {}
      renderLogin('ยกเลิกการตั้งค่า MFA แล้ว กรุณาเข้าสู่ระบบอีกครั้ง');
    });
  }

  async function verifyEnrollment() {
    const code = document.getElementById('siam-mfa-enroll-code')?.value.trim();
    if (!/^\d{6}$/.test(code || '')) {
      showMfaMessage('กรุณากรอกรหัส 6 หลักจาก Authenticator', false);
      return;
    }
    const c = client();
    try {
      const { data: challenge, error: challengeError } = await c.auth.mfa.challenge({ factorId: currentFactorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await c.auth.mfa.verify({
        factorId: currentFactorId,
        challengeId: challenge.id,
        code
      });
      if (verifyError) throw verifyError;
      pendingEnrollment = null;
      await finishAccess();
    } catch (err) {
      showMfaMessage(err?.message || 'รหัส MFA ไม่ถูกต้อง', false);
    }
  }

  async function renderMfaChallenge() {
    const root = document.getElementById('siam-auth-content');
    root.innerHTML = `
      <h2 class="siam-login-title">ยืนยันตัวตนขั้นที่ 2</h2>
      <p class="siam-login-sub">เปิดแอป Authenticator ของคุณ แล้วกรอกรหัส 6 หลักเพื่อเข้าใช้งาน Siamhrbp OrgFlow-Pro</p>
      <div class="siam-field">
        <label class="siam-label" for="siam-mfa-code">รหัส MFA</label>
        <input id="siam-mfa-code" class="siam-input siam-mfa-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" />
      </div>
      <div id="siam-mfa-message"></div>
      <button class="siam-submit" id="siam-mfa-submit" type="button">✓ ยืนยันและเข้าใช้งาน</button>
      <button class="siam-back" id="siam-mfa-back" type="button">กลับไปหน้า Login</button>
    `;
    document.getElementById('siam-mfa-submit')?.addEventListener('click', verifyMfa);
    document.getElementById('siam-mfa-back')?.addEventListener('click', async () => {
      try { await svc().signOut(); } catch (_) {}
      renderLogin();
    });
  }

  async function verifyMfa() {
    const code = document.getElementById('siam-mfa-code')?.value.trim();
    if (!/^\d{6}$/.test(code || '')) {
      showMfaMessage('กรุณากรอกรหัส 6 หลัก', false);
      return;
    }
    const c = client();
    try {
      const { data, error } = await c.auth.mfa.challenge({ factorId: currentFactorId });
      if (error) throw error;
      currentChallengeId = data.id;
      const { error: verifyError } = await c.auth.mfa.verify({
        factorId: currentFactorId,
        challengeId: currentChallengeId,
        code
      });
      if (verifyError) throw verifyError;
      await finishAccess();
    } catch (err) {
      showMfaMessage(err?.message || 'รหัส MFA ไม่ถูกต้อง', false);
    }
  }

  function showMfaMessage(message, success) {
    const el = document.getElementById('siam-mfa-message');
    if (el) el.innerHTML = `<div class="${success ? 'siam-success' : 'siam-error'}">${escapeHtml(message)}</div>`;
  }

  async function finishAccess() {
    // Verify AAL2 before removing the gate.
    const c = client();
    const { data: aal, error } = await c.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (aal?.currentLevel !== 'aal2') {
      throw new Error('ยังไม่ได้ยืนยัน MFA ครบ 2 ขั้นตอน');
    }

    const profile = await svc().getCurrentProfile();

    // Replace demo/local data with authoritative cloud data, including an empty cloud table.
    if (window.OrgApp && typeof window.OrgApp === 'object') {
      try {
        const cloud = await svc().listEmployees();
        window.OrgApp.data = Array.isArray(cloud) ? cloud : [];
        window.OrgApp.activeDeptFilter = 'ALL';
        window.OrgApp.updateStats?.();
        window.OrgApp.renderDeptFilters?.();
        window.OrgApp.populateManagerDropdown?.();
        window.OrgApp.renderCurrentView?.();
      } catch (err) {
        console.error('Cloud data load after login failed', err);
        throw err;
      }
    }

    setBranding(profile);
    setLocked(false);
    document.body.classList.remove('select-none');
    window.dispatchEvent(new CustomEvent('siamhrbp-auth-ready', { detail: { profile } }));
  }

  function setBranding(profile) {
    document.title = APP_NAME + ' | Organization Management';
    const h1 = document.querySelector('header h1');
    if (h1) h1.textContent = APP_NAME;
    const staticBadge = document.querySelector('header h1')?.parentElement?.querySelector('span span');
    if (staticBadge) staticBadge.textContent = 'Supabase Cloud';
    const status = document.getElementById('orgflow-cloud-status');
    if (status) status.textContent = 'Supabase Cloud';
    const moreDemo = document.getElementById('btn-reset-demo');
    if (moreDemo) moreDemo.closest('button')?.remove();
    const user = svc()?.getUser?.();
    const authBtn = document.getElementById('orgflow-auth-btn');
    if (authBtn) {
      authBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>';
      authBtn.title = user?.email || profile?.full_name || 'Account';
    }
  }

  async function onAuthStateChange() {
    const s = svc();
    if (!s) return;
    if (!s.isAuthenticated()) {
      setLocked(true);
      renderLogin();
      return;
    }
    try {
      const { data: aal } = await client().auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal2') {
        await finishAccess();
      } else {
        await continueAfterPassword();
      }
    } catch (err) {
      console.error('Auth gate state error', err);
      try { await s.signOut(); } catch (_) {}
      setLocked(true);
      renderLogin(err?.message || 'ไม่สามารถยืนยันตัวตนได้');
    }
  }

  async function init() {
    injectStyles();
    ensureGate();
    setLocked(true);

    if (!isConfigured()) {
      renderLogin('ยังไม่ได้ตั้งค่า Supabase ใน js/config.js — กรุณาใส่ Project URL และ Publishable/Anon Key ก่อนใช้งาน', false);
      return;
    }

    const c = client();
    if (!c) {
      renderLogin('ไม่พบ Supabase client', false);
      return;
    }

    c.auth.onAuthStateChange((_event, session) => {
      // Defer work to avoid locking the auth callback on Supabase internals.
      setTimeout(() => onAuthStateChange(), 0);
    });

    const { data } = await c.auth.getSession();
    if (data?.session) {
      await onAuthStateChange();
    } else {
      renderLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
