/** Siamhrbp OrgFlow-Pro — STEP 8.6 Production Bootstrap */
(function () {
  'use strict';
  let started = false;
  const scripts = ['js/sample-data.js','js/excel-service.js','js/chart-renderer.js','js/app.js','js/permissions-import.js'];
  function load(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src + '?v=8.6';
      el.async = false;
      el.onload = resolve;
      el.onerror = () => reject(new Error('โหลด ' + src + ' ไม่สำเร็จ'));
      document.body.appendChild(el);
    });
  }
  async function boot() {
    if (started) return;
    started = true;
    try {
      for (const src of scripts) await load(src);
      const svc = window.OrgFlowSupabaseService;
      if (!svc?.isAuthenticated()) throw new Error('ไม่พบ Supabase session หลัง Authentication');
      if (!window.OrgApp) throw new Error('OrgApp ยังไม่พร้อมหลังโหลด app.js');
      const cloud = await svc.listEmployees();
      // PRODUCTION RULE: authenticated cloud is the source of truth.
      // Zero cloud rows means zero employees — NEVER restore demo/local data.
      window.OrgApp.data = Array.isArray(cloud) ? cloud : [];
      window.OrgApp.activeDeptFilter = 'ALL';
      window.OrgApp.updateStats?.();
      window.OrgApp.renderDeptFilters?.();
      window.OrgApp.populateManagerDropdown?.();
      window.OrgApp.renderCurrentView?.();
      window.OrgApp.updateCloudStatus?.();
      window.OrgApp.refreshAuthButton?.();
      window.dispatchEvent(new CustomEvent('siamhrbp-orgflow-booted'));
    } catch (e) {
      console.error('[STEP8.6 bootstrap]', e);
      started = false;
      const box = document.createElement('div');
      box.style.cssText='position:fixed;left:20px;right:20px;bottom:20px;z-index:200000;padding:14px;background:#3b0d0d;color:#ffd0d0;border-radius:12px;font:12px/1.5 system-ui';
      box.textContent='Siamhrbp OrgFlow-Pro โหลดระบบไม่สำเร็จ: '+(e.message||e);
      document.body.appendChild(box);
    }
  }
  window.addEventListener('siamhrbp-auth-ready', () => setTimeout(boot,0));
  window.addEventListener('siamhrbp-auth-logged-out', () => {
    // Keep application loaded in memory; auth gate covers it until the next login.
    const svc = window.OrgFlowSupabaseService;
    if (window.OrgApp) {
      window.OrgApp.data = [];
      window.OrgApp.updateStats?.();
      window.OrgApp.renderDeptFilters?.();
      window.OrgApp.renderCurrentView?.();
      window.OrgApp.updateCloudStatus?.();
      window.OrgApp.refreshAuthButton?.();
    }
  });
})();
