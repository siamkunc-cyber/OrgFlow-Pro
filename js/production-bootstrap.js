/**
 * Siamhrbp OrgFlow-Pro — Production Bootstrap
 * STEP 8.4
 * The application is loaded only after the auth gate dispatches siamhrbp-auth-ready.
 */
(function () {
  'use strict';
  let started = false;
  const scripts = ['js/sample-data.js','js/excel-service.js','js/chart-renderer.js','js/app.js','js/permissions-import.js'];

  function load(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src + '?v=8.4';
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
      if (svc?.listEmployees && window.OrgApp) {
        const cloud = await svc.listEmployees();
        window.OrgApp.data = Array.isArray(cloud) ? cloud : [];
        window.OrgApp.activeDeptFilter = 'ALL';
        window.OrgApp.updateStats?.();
        window.OrgApp.renderDeptFilters?.();
        window.OrgApp.populateManagerDropdown?.();
        window.OrgApp.renderCurrentView?.();
      }
      window.dispatchEvent(new CustomEvent('siamhrbp-orgflow-booted'));
    } catch (e) {
      console.error('[STEP8.4 bootstrap]', e);
      started = false;
      const box = document.createElement('div');
      box.style.cssText='position:fixed;left:20px;right:20px;bottom:20px;z-index:200000;padding:14px;background:#3b0d0d;color:#ffd0d0;border-radius:12px;font:12px/1.5 system-ui';
      box.textContent='Siamhrbp OrgFlow-Pro โหลดระบบไม่สำเร็จ: '+(e.message||e);
      document.body.appendChild(box);
    }
  }
  window.addEventListener('siamhrbp-auth-ready', () => setTimeout(boot,0));
})();
