/**
 * Siamhrbp OrgFlow-Pro — STEP 8.8 REAL PRODUCTION BOOTSTRAP
 *
 * Single-owner boot strategy:
 * - auth-gate owns authentication.
 * - this file owns loading the application.
 * - app.js legacy DOMContentLoaded auto-start is allowed to create exactly one OrgApp.
 * - before that happens, we patch its data-loading methods so authenticated Production
 *   NEVER falls back to localStorage/demo data.
 * - Supabase returning [] is a valid Production state.
 */
(function () {
  'use strict';

  let bootStarted = false;
  let scriptsLoaded = false;
  const scripts = [
    'js/sample-data.js',
    'js/excel-service.js',
    'js/chart-renderer.js',
    'js/app.js',
    'js/permissions-import.js'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src + '?v=8.8';
      el.async = false;
      el.onload = resolve;
      el.onerror = () => reject(new Error('โหลด ' + src + ' ไม่สำเร็จ'));
      document.body.appendChild(el);
    });
  }

  function patchProductionDataPolicy() {
    if (typeof OrgAppController === 'undefined') {
      throw new Error('OrgAppController ไม่พร้อมหลังโหลด app.js');
    }

    // Authenticated Production is always authoritative, including zero rows.
    OrgAppController.prototype.loadInitialData = async function () {
      const svc = window.OrgFlowSupabaseService;
      if (!svc || !svc.isConfigured() || !svc.isAuthenticated()) {
        this.data = [];
        return;
      }

      const cloud = await svc.listEmployees();
      this.data = Array.isArray(cloud) ? cloud : [];
    };

    // Never restore browser/demo data after logout or auth-state changes.
    OrgAppController.prototype.loadLocalOrDemoData = function () {
      this.data = [];
    };

    window.SIAMHRBP_PRODUCTION_BOOT_V88 = true;
  }

  function waitForOrgApp(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (window.OrgApp) return resolve(window.OrgApp);
        if (Date.now() - startedAt > timeoutMs) {
          return reject(new Error('OrgApp ไม่เริ่มทำงานภายใน ' + timeoutMs + 'ms'));
        }
        setTimeout(tick, 25);
      };
      tick();
    });
  }

  async function boot() {
    if (bootStarted) return;
    bootStarted = true;

    try {
      if (!scriptsLoaded) {
        for (const src of scripts) await loadScript(src);
        patchProductionDataPolicy();
        scriptsLoaded = true;
      }

      // app.js registers its own DOMContentLoaded starter. We must NOT instantiate
      // another OrgApp here. Wait for that one instance instead.
      const app = await waitForOrgApp();
      const svc = window.OrgFlowSupabaseService;
      if (!svc?.isAuthenticated()) {
        throw new Error('ไม่พบ Supabase session หลัง Authentication');
      }

      // Final authoritative refresh. This is intentionally one render only.
      const cloud = await svc.listEmployees();
      app.data = Array.isArray(cloud) ? cloud : [];
      app.activeDeptFilter = 'ALL';
      app.updateStats?.();
      app.renderDeptFilters?.();
      app.populateManagerDropdown?.();
      app.renderCurrentView?.();
      app.updateCloudStatus?.();
      app.refreshAuthButton?.();

      window.dispatchEvent(new CustomEvent('siamhrbp-orgflow-booted', {
        detail: { employeeCount: app.data.length }
      }));

      console.log('[STEP8.8] Production boot complete:', app.data.length, 'employees');
    } catch (e) {
      console.error('[STEP8.8 bootstrap]', e);
      bootStarted = false;
      const old = document.getElementById('siamhrbp-bootstrap-error');
      if (old) old.remove();
      const box = document.createElement('div');
      box.id = 'siamhrbp-bootstrap-error';
      box.style.cssText = 'position:fixed;left:20px;right:20px;bottom:40px;z-index:200000;padding:14px;background:#3b0d0d;color:#ffd0d0;border-radius:12px;font:12px/1.5 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.25)';
      box.textContent = 'Siamhrbp OrgFlow-Pro โหลดระบบไม่สำเร็จ: ' + (e?.message || e);
      document.body.appendChild(box);
    }
  }

  window.addEventListener('siamhrbp-auth-ready', () => {
    // Let the current parser/DOM event cycle settle before dynamically loading app.js.
    setTimeout(boot, 0);
  }, { once: false });

  window.addEventListener('siamhrbp-auth-logged-out', () => {
    const app = window.OrgApp;
    if (!app) return;
    app.data = [];
    app.activeDeptFilter = 'ALL';
    app.updateStats?.();
    app.renderDeptFilters?.();
    app.populateManagerDropdown?.();
    app.renderCurrentView?.();
    app.updateCloudStatus?.();
    app.refreshAuthButton?.();
  });
})();
