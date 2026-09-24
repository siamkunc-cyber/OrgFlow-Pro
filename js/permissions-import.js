
/**
 * OrgFlow Pro V2.1 - RBAC + Safe Excel Import patch
 * Load AFTER js/app.js
 *
 * Roles:
 * SUPER_ADMIN: view/add/edit/delete/import
 * HR_ADMIN:   view/add/edit/delete/import
 * EMPLOYEE:   view only
 */
(function () {
  'use strict';

  const ROLE_ORDER = { SUPER_ADMIN: 1, HR_ADMIN: 2, EMPLOYEE: 3 };

  const State = {
    role: null,
    profile: null,
    ready: false
  };

  function svc() {
    return window.OrgFlowSupabaseService || null;
  }

  function isAdmin() {
    return State.role === 'SUPER_ADMIN' || State.role === 'HR_ADMIN';
  }

  function can(action) {
    if (action === 'view') return Boolean(State.role);
    if (['add', 'edit', 'delete', 'import'].includes(action)) return isAdmin();
    return false;
  }

  async function loadRole() {
    const s = svc();
    State.role = null;
    State.profile = null;

    if (!s || !s.isAuthenticated()) {
      State.ready = true;
      applyUI();
      return;
    }

    try {
      const profile = await s.getCurrentProfile();
      State.profile = profile;
      State.role = profile?.role || null;
    } catch (e) {
      console.error('OrgFlow RBAC profile load failed:', e);
      State.role = null;
      if (window.Swal) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถตรวจสอบสิทธิ์ได้',
          text: 'ระบบจะไม่เปิดสิทธิ์แก้ไขข้อมูลจนกว่าจะตรวจสอบ Role สำเร็จ'
        });
      }
    }

    State.ready = true;
    applyUI();
    updateRoleBadge();
  }

  function setVisible(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', !visible);
    el.disabled = !visible;
    el.setAttribute('aria-hidden', String(!visible));
  }

  function updateRoleBadge() {
    const host = document.getElementById('orgflow-role-badge');
    if (!host) return;
    const labels = {
      SUPER_ADMIN: 'SUPER ADMIN',
      HR_ADMIN: 'HR ADMIN',
      EMPLOYEE: 'EMPLOYEE'
    };
    host.textContent = labels[State.role] || 'VIEW ONLY';
    host.className =
      'px-2 py-1 rounded-lg border text-[10px] font-bold ' +
      (isAdmin()
        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : 'bg-slate-50 text-slate-600 border-slate-200');
  }

  function ensureRoleBadge() {
    const auth = document.getElementById('orgflow-auth-btn');
    if (!auth || document.getElementById('orgflow-role-badge')) return;
    const badge = document.createElement('span');
    badge.id = 'orgflow-role-badge';
    badge.className = 'px-2 py-1 rounded-lg border bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-bold';
    auth.parentElement?.prepend(badge);
  }

  function applyUI() {
    ensureRoleBadge();
    updateRoleBadge();

    // Main actions
    setVisible('btn-open-upload', isAdmin());
    setVisible('btn-open-add', isAdmin());

    // Template is harmless and can remain available to all authenticated users.
    setVisible('btn-download-template', Boolean(State.role));

    // More menu: hide destructive/local mutation controls for employees.
    setVisible('btn-save-local', isAdmin());
    setVisible('btn-clear-all', isAdmin());

    // Export can remain available to all authenticated users.
    setVisible('btn-export-menu', Boolean(State.role));

    // Patch existing table/detail buttons after every render.
    document.querySelectorAll(
      '[title="แก้ไข"], [title="ลบ"], #detail-btn-edit, #detail-btn-delete, #detail-btn-add-sub'
    ).forEach(el => {
      const action =
        el.id === 'detail-btn-delete' || (el.title || '').includes('ลบ')
          ? 'delete'
          : el.id === 'detail-btn-edit' || (el.title || '').includes('แก้ไข')
          ? 'edit'
          : 'add';
      el.classList.toggle('hidden', !can(action));
      el.disabled = !can(action);
    });
  }

  function guard(action) {
    if (!can(action)) {
      if (window.Swal) {
        Swal.fire({
          icon: 'info',
          title: 'ไม่มีสิทธิ์ดำเนินการ',
          text: 'บัญชี Employee มีสิทธิ์ดูผังองค์กรเท่านั้น'
        });
      }
      return false;
    }
    return true;
  }

  // Build a safe import preview and commit only after explicit confirmation.
  async function safeImport(file) {
    if (!guard('import')) return;

    try {
      Swal.fire({
        title: 'กำลังตรวจสอบไฟล์...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const parsed = await window.ExcelService.parseFile(file);
      const rows = parsed.rawData || [];
      const validation = parsed.validation || { isValid: false, errors: [], warnings: [] };

      if (!validation.isValid) {
        Swal.fire({
          icon: 'error',
          title: 'ไฟล์ไม่ผ่านการตรวจสอบ',
          html:
            '<div class="text-left text-xs text-red-700 bg-red-50 p-3 rounded-lg max-h-56 overflow-y-auto">' +
            (validation.errors || []).map(x => `<div>• ${escapeHtml(x)}</div>`).join('') +
            '</div>'
        });
        return;
      }

      // Extra validation against current in-memory dataset.
      const ids = new Set();
      const errors = [];
      const currentIds = new Set((window.OrgApp?.data || []).map(x => String(x.id)));

      rows.forEach((r, i) => {
        const id = String(r.id || '').trim();
        if (!id) errors.push(`แถว ${i + 1}: ไม่มี ID`);
        if (ids.has(id)) errors.push(`ID ซ้ำในไฟล์: ${id}`);
        ids.add(id);

        if (r.reportsTo && String(r.reportsTo) === id) {
          errors.push(`แถว ${i + 1}: ReportsTo อ้างอิงตัวเอง (${id})`);
        }
      });

      if (errors.length) {
        Swal.fire({
          icon: 'error',
          title: 'พบข้อมูลซ้ำ/ผิดเงื่อนไข',
          html:
            '<div class="text-left text-xs text-red-700 bg-red-50 p-3 rounded-lg max-h-56 overflow-y-auto">' +
            errors.map(x => `<div>• ${escapeHtml(x)}</div>`).join('') +
            '</div>'
        });
        return;
      }

      const mode =
        document.querySelector('input[name="import-mode"]:checked')?.value || 'replace';

      const newCount = rows.filter(r => !currentIds.has(String(r.id))).length;
      const updateCount = rows.length - newCount;

      const warnings = (validation.warnings || []).slice();
      if (mode === 'merge' && warnings.length) {
        warnings.push('โหมด Merge จะตรวจ ReportsTo กับข้อมูลที่มีอยู่ใน Supabase อีกครั้งก่อนบันทึก');
      }

      Swal.close();

      const confirm = await Swal.fire({
        icon: 'question',
        title: 'ยืนยันการนำเข้าข้อมูล',
        html: `
          <div class="text-left text-sm space-y-2">
            <div><b>จำนวนรายการ:</b> ${rows.length}</div>
            <div><b>รายการใหม่:</b> ${newCount}</div>
            <div><b>รายการเดิม/แก้ไข:</b> ${updateCount}</div>
            <div><b>โหมด:</b> ${mode === 'replace' ? 'แทนที่ทั้งหมด' : 'Merge'}</div>
            ${
              warnings.length
                ? `<div class="mt-2 p-2 bg-amber-50 text-amber-800 rounded-lg text-xs">${warnings
                    .slice(0, 8)
                    .map(x => `<div>• ${escapeHtml(x)}</div>`)
                    .join('')}</div>`
                : ''
            }
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'ยืนยันและบันทึก',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#4f46e5'
      });

      if (!confirm.isConfirmed) return;

      Swal.fire({
        title: 'กำลังบันทึกลง Supabase...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const s = svc();
      if (!s || !s.isAuthenticated()) throw new Error('กรุณา Login ก่อน Import');
      await s.importEmployees(rows, mode);

      const cloud = await s.listEmployees();
      window.OrgApp.data = Array.isArray(cloud) ? cloud : rows;

      // Keep browser cache only as convenience, never as the source of truth.
      try {
        localStorage.setItem('orgflow_chart_data_v1', JSON.stringify(window.OrgApp.data));
      } catch (_) {}

      window.OrgApp.updateStats();
      window.OrgApp.renderDeptFilters();
      window.OrgApp.populateManagerDropdown();
      window.OrgApp.renderCurrentView();

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลสำเร็จ',
        html: `บันทึกลง Supabase แล้ว <b>${rows.length}</b> รายการ`,
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Import ไม่สำเร็จ',
        text: err?.message || 'ไม่สามารถบันทึกข้อมูลลง Supabase ได้'
      });
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function patchOrgApp() {
    if (!window.OrgApp) return;

    const originalAdd = window.OrgApp.openAddModal?.bind(window.OrgApp);
    const originalEdit = window.OrgApp.openEditModal?.bind(window.OrgApp);
    const originalDelete = window.OrgApp.deleteNode?.bind(window.OrgApp);
    const originalOpenDetail = window.OrgApp.openDetailModal?.bind(window.OrgApp);

    if (originalAdd) {
      window.OrgApp.openAddModal = function () {
        if (!guard('add')) return;
        return originalAdd();
      };
    }

    if (originalEdit) {
      window.OrgApp.openEditModal = function (id) {
        if (!guard('edit')) return;
        return originalEdit(id);
      };
    }

    if (originalDelete) {
      window.OrgApp.deleteNode = function (id) {
        if (!guard('delete')) return;
        return originalDelete(id);
      };
    }

    if (originalOpenDetail) {
      window.OrgApp.openDetailModal = function (id) {
        const result = originalOpenDetail(id);
        setTimeout(applyUI, 0);
        return result;
      };
    }

    // Replace the original direct-write import handler with preview + safe commit.
    window.OrgApp.processExcelUpload = function (file) {
      return safeImport(file);
    };

    setTimeout(applyUI, 0);
  }

  async function init() {
    patchOrgApp();
    ensureRoleBadge();
    await loadRole();
    applyUI();

    window.addEventListener('orgflow-auth-changed', async () => {
      await loadRole();
      applyUI();
      if (window.OrgApp && svc()?.isAuthenticated()) {
        try {
          const cloud = await svc().listEmployees();
          if (Array.isArray(cloud)) {
            window.OrgApp.data = cloud;
            window.OrgApp.updateStats();
            window.OrgApp.renderDeptFilters();
            window.OrgApp.populateManagerDropdown();
            window.OrgApp.renderCurrentView();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Re-apply after OrgFlow renders dynamic buttons.
    const observer = new MutationObserver(() => applyUI());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.OrgFlowRBAC = {
    getRole: () => State.role,
    can,
    isAdmin,
    reload: loadRole
  };
})();
