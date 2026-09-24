/**
 * Siamhrbp OrgFlow-Pro — Production App Bootstrap
 * STEP 8.1
 *
 * Do not start the heavy OrgFlow application before authentication.
 * app.js previously booted immediately and rendered Demo/Local data behind
 * the login gate, which could make GitHub Pages appear frozen on larger data.
 *
 * Flow:
 *   config -> Supabase -> Auth Gate -> password -> TOTP/AAL2 -> app bootstrap
 */
(function () {
  'use strict';

  let started = false;
  const scripts = [
    'js/sample-data.js',
    'js/excel-service.js',
    'js/chart-renderer.js',
    'js/app.js',
    'js/permissions-import.js'
  ];

  function showBootError(message) {
    let el = document.getElementById('orgflow-bootstrap-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'orgflow-bootstrap-error';
      el.style.cssText = [
        'position:fixed','left:20px','right:20px','bottom:20px','z-index:200000',
        'padding:14px 16px','border-radius:12px','background:#3b0d0d',
        'border:1px solid rgba(255,120,120,.35)','color:#ffd0d0',
        'font:12px/1.6 system-ui,sans-serif','box-shadow:0 12px 30px rgba(0,0,0,.3)'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = 'Siamhrbp OrgFlow-Pro โหลดระบบไม่สำเร็จ: ' + message;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-orgflow-dynamic="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('โหลด ' + src + ' ไม่สำเร็จ')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.orgflowDynamic = src;
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error('โหลด ' + src + ' ไม่สำเร็จ'));
      document.body.appendChild(script);
    });
  }

  async function startAfterAuth() {
    if (started || !window.OrgFlowSupabaseService?.isAuthenticated?.()) return;
    started = true;
    try {
      for (const src of scripts) await loadScript(src);
      window.dispatchEvent(new CustomEvent('siamhrbp-orgflow-booted'));
    } catch (err) {
      started = false;
      console.error('[OrgFlow bootstrap]', err);
      showBootError(err?.message || 'Unknown bootstrap error');
    }
  }

  window.addEventListener('siamhrbp-auth-ready', () => {
    // Let the auth gate finish hiding itself before the application creates
    // the chart and other heavier UI.
    setTimeout(startAfterAuth, 0);
  });

  // If a session was already authenticated before this script loaded, verify
  // it after the current event loop without bypassing the auth gate.
  setTimeout(() => {
    if (window.OrgFlowSupabaseService?.isAuthenticated?.()) {
      const gate = document.getElementById('siamhrbp-auth-gate');
      if (gate?.classList.contains('siam-hidden')) startAfterAuth();
    }
  }, 250);
})();
