/**
 * Siamhrbp OrgFlow-Pro — STEP 8.9 REAL BOOT
 * Single application owner. app.js is evaluated without its legacy auto-start block.
 * Supabase is the only data source after authentication. Zero rows = zero rows.
 */
(function () {
  'use strict';
  let started = false;

  function loadScript(src, version) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src + '?v=' + encodeURIComponent(version || '8.9');
      el.async = false;
      el.onload = resolve;
      el.onerror = () => reject(new Error('โหลด ' + src + ' ไม่สำเร็จ'));
      document.body.appendChild(el);
    });
  }

  async function loadAppController() {
    const response = await fetch('js/app.js?v=8.9', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('โหลด js/app.js ไม่สำเร็จ (' + response.status + ')');
    let source = await response.text();

    // Remove the legacy auto-start block at the end of app.js.
    const marker = '// Function to safely boot the application';
    const idx = source.indexOf(marker);
    if (idx >= 0) source = source.slice(0, idx);

    // Return the controller class from the evaluated source.
    source += '\n;return OrgAppController;';
    const Factory = new Function(source);
    const Controller = Factory();
    if (typeof Controller !== 'function') throw new Error('OrgAppController ไม่พร้อมใช้งาน');
    return Controller;
  }

  async function boot() {
    if (started) return;
    started = true;
    try {
      const svc = window.OrgFlowSupabaseService;
      if (!svc?.isAuthenticated()) throw new Error('ไม่พบ Supabase session หลัง Authentication');

      // Dependencies first; app.js is intentionally NOT inserted as a normal script tag.
      await loadScript('js/sample-data.js', '8.9');
      await loadScript('js/excel-service.js', '8.9');
      await loadScript('js/chart-renderer.js', '8.9');

      const Controller = await loadAppController();
      const app = new Controller();
      window.OrgApp = app;

      // The production shell owns authentication UI. Do not let the legacy app create
      // a second Login/Logout control in the header.
      app.setupAuthUI = function () {};
      app.refreshAuthButton = function () {};

      // Production data policy: Supabase is authoritative. Never fall back to local/demo.
      app.loadInitialData = async function () {
        const cloud = await svc.listEmployees();
        this.data = Array.isArray(cloud) ? cloud : [];
      };

      await app.init();

      // Load RBAC only after the real OrgApp instance exists.
      await loadScript('js/permissions-import.js', '8.9');

      // One final authoritative read after all UI patches are attached.
      const cloud = await svc.listEmployees();
      app.data = Array.isArray(cloud) ? cloud : [];
      app.updateStats?.();
      app.renderDeptFilters?.();
      app.populateManagerDropdown?.();
      app.renderCurrentView?.();

      console.info('[STEP8.9] Production boot complete:', app.data.length, 'employees');
      window.dispatchEvent(new CustomEvent('siamhrbp-orgflow-booted', {
        detail: { employeeCount: app.data.length }
      }));
    } catch (e) {
      console.error('[STEP8.9 boot]', e);
      started = false;
      window.dispatchEvent(new CustomEvent('siamhrbp-orgflow-boot-failed', {
        detail: { message: e?.message || String(e) }
      }));
      const box = document.createElement('div');
      box.id = 'siamhrbp-boot-error';
      box.style.cssText = 'position:fixed;left:20px;right:20px;bottom:20px;z-index:200000;padding:14px;background:#3b0d0d;color:#ffd0d0;border-radius:12px;font:12px/1.5 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.2)';
      box.textContent = 'Siamhrbp OrgFlow-Pro โหลดระบบไม่สำเร็จ: ' + (e?.message || e);
      document.body.appendChild(box);
    }
  }

  window.addEventListener('siamhrbp-auth-ready', () => setTimeout(boot, 0));
  window.addEventListener('siamhrbp-auth-logged-out', () => {
    started = false;
    if (window.OrgApp) {
      window.OrgApp.data = [];
      window.OrgApp.updateStats?.();
      window.OrgApp.renderDeptFilters?.();
      window.OrgApp.populateManagerDropdown?.();
      window.OrgApp.renderCurrentView?.();
    }
  });
})();
