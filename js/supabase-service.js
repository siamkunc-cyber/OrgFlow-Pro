
/**
 * OrgFlow Pro V2.1 - Supabase service extension
 * This file is intended to REPLACE js/supabase-service.js.
 *
 * Adds:
 * - getCurrentProfile()
 * - role-aware import
 * - dependency-safe client fallback
 */
(function () {
  'use strict';

  class OrgFlowSupabaseService {
    constructor() {
      this.client = null;
      this.session = null;
      this.config = window.ORG_FLOW_CONFIG || {};
      this.configured = Boolean(
        this.config.SUPABASE_URL &&
        this.config.SUPABASE_PUBLISHABLE_KEY &&
        window.supabase &&
        typeof window.supabase.createClient === 'function'
      );

      if (this.configured) {
        this.client = window.supabase.createClient(
          this.config.SUPABASE_URL,
          this.config.SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        );

        this.client.auth.getSession().then(({ data }) => {
          this.session = data.session || null;
        });

        this.client.auth.onAuthStateChange((_event, session) => {
          this.session = session || null;
          window.dispatchEvent(
            new CustomEvent('orgflow-auth-changed', { detail: { session: this.session } })
          );
        });
      }
    }

    isConfigured() {
      return this.configured;
    }

    isAuthenticated() {
      return Boolean(this.session);
    }

    getUser() {
      return this.session ? this.session.user : null;
    }

    async signIn(email, password) {
      if (!this.configured) throw new Error('ยังไม่ได้ตั้งค่า Supabase ใน js/config.js');
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.session = data.session;
      return data;
    }

    async signOut() {
      if (!this.configured) return;
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      this.session = null;
    }

    async getCurrentProfile() {
      if (!this.configured || !this.isAuthenticated()) return null;

      const uid = this.getUser()?.id;
      if (!uid) return null;

      const { data, error } = await this.client
        .from('org_user_profiles')
        .select('user_id, full_name, role, is_active')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('ไม่พบ User Profile ของบัญชีนี้');
      if (data.is_active !== true) throw new Error('บัญชีนี้ถูกปิดการใช้งาน');
      return data;
    }

    async listEmployees() {
      if (!this.configured || !this.isAuthenticated()) return null;

      const { data, error } = await this.client
        .from('org_employees')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      return (data || []).map(OrgFlowSupabaseService.fromRow);
    }

    async upsertEmployees(items) {
      if (!this.configured || !this.isAuthenticated()) {
        throw new Error('กรุณา Login ก่อนบันทึกข้อมูล');
      }
      if (!Array.isArray(items)) throw new Error('ข้อมูลพนักงานไม่ถูกต้อง');

      const rows = items.map(OrgFlowSupabaseService.toRow);
      if (!rows.length) return true;

      const ordered = OrgFlowSupabaseService.orderByDependencies(rows);

      for (const batch of ordered) {
        const { error } = await this.client
          .from('org_employees')
          .upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      return true;
    }

    async deleteEmployee(id) {
      if (!this.configured || !this.isAuthenticated()) {
        throw new Error('กรุณา Login ก่อนลบข้อมูล');
      }

      const { error } = await this.client
        .from('org_employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    }

    async replaceEmployees(items) {
      if (!this.configured || !this.isAuthenticated()) {
        throw new Error('กรุณา Login ก่อนบันทึกข้อมูล');
      }

      // Clear current rows first. RLS controls who is allowed to do this.
      const { error: deleteError } = await this.client
        .from('org_employees')
        .delete()
        .neq('id', '__ORG_FLOW_NEVER_MATCH__');

      if (deleteError) throw deleteError;

      if (Array.isArray(items) && items.length) {
        await this.upsertEmployees(items);
      }

      return true;
    }

    async importEmployees(items, mode = 'merge') {
      const profile = await this.getCurrentProfile();
      if (!profile || !['SUPER_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
        throw new Error('บัญชีนี้ไม่มีสิทธิ์ Import Excel');
      }

      if (!Array.isArray(items) || !items.length) {
        throw new Error('ไม่พบข้อมูลสำหรับ Import');
      }

      const normalized = items.map(OrgFlowSupabaseService.normalizeItem);
      OrgFlowSupabaseService.validateClientHierarchy(normalized);

      if (mode === 'replace') {
        return this.replaceEmployees(normalized);
      }

      if (mode !== 'merge') {
        throw new Error('Import mode ไม่ถูกต้อง');
      }

      return this.upsertEmployees(normalized);
    }

    static normalizeItem(item) {
      return {
        id: String(item.id || '').trim(),
        name: String(item.name || '').trim(),
        position: String(item.position || '').trim(),
        department: String(item.department || 'General').trim() || 'General',
        reportsTo: String(item.reportsTo || '').trim(),
        roleLevel: String(item.roleLevel || 'Staff').trim() || 'Staff',
        email: String(item.email || '').trim(),
        phone: String(item.phone || '').trim(),
        avatarUrl: String(item.avatarUrl || '').trim()
      };
    }

    static validateClientHierarchy(items) {
      const ids = new Set();

      for (const item of items) {
        if (!item.id) throw new Error('พบรายการที่ไม่มี Employee ID');
        if (!item.name) throw new Error(`Employee ${item.id}: ไม่มีชื่อ`);
        if (!item.position) throw new Error(`Employee ${item.id}: ไม่มีตำแหน่ง`);
        if (ids.has(item.id)) throw new Error(`Employee ID ซ้ำ: ${item.id}`);
        ids.add(item.id);
        if (item.reportsTo === item.id) {
          throw new Error(`Employee ${item.id}: ReportsTo อ้างอิงตัวเอง`);
        }
      }

      // Validate cycles inside imported set.
      const map = new Map(items.map(x => [x.id, x]));
      for (const item of items) {
        const seen = new Set([item.id]);
        let p = item.reportsTo;
        while (p) {
          if (seen.has(p)) {
            throw new Error(`พบ Circular Reference ที่ Employee ${item.id}`);
          }
          seen.add(p);
          const parent = map.get(p);
          if (!parent) break;
          p = parent.reportsTo;
        }
      }
    }

    static orderByDependencies(rows) {
      const pending = rows.slice();
      const result = [];
      const inserted = new Set();

      while (pending.length) {
        const ready = pending.filter(
          row => !row.reports_to || inserted.has(row.reports_to) ||
            !pending.some(x => x.id === row.reports_to)
        );

        if (!ready.length) {
          // Let the database report a precise FK/cycle error rather than looping forever.
          result.push(pending.splice(0));
          break;
        }

        result.push(ready.slice());
        ready.forEach(row => inserted.add(row.id));
        const readyIds = new Set(ready.map(x => x.id));
        for (let i = pending.length - 1; i >= 0; i--) {
          if (readyIds.has(pending[i].id)) pending.splice(i, 1);
        }
      }

      return result;
    }

    static toRow(item) {
      return {
        id: item.id,
        name: item.name,
        position: item.position,
        department: item.department || 'General',
        reports_to: item.reportsTo || null,
        role_level: item.roleLevel || 'Staff',
        email: item.email || null,
        phone: item.phone || null,
        avatar_url: item.avatarUrl || null
      };
    }

    static fromRow(row) {
      return {
        id: row.id,
        name: row.name,
        position: row.position,
        department: row.department || 'General',
        reportsTo: row.reports_to || '',
        roleLevel: row.role_level || 'Staff',
        email: row.email || '',
        phone: row.phone || '',
        avatarUrl: row.avatar_url || ''
      };
    }
  }

  // STEP 7 FINAL: persistent application footer.
  // This file is already loaded by index.html, so no extra script tag is required.
  function ensureBrandFooter() {
    const render = () => {
      if (document.getElementById('orgflow-brand-footer')) return;
      const footer = document.createElement('footer');
      footer.id = 'orgflow-brand-footer';
      footer.setAttribute('aria-label', 'OrgFlow copyright');
      footer.innerHTML = '&copy;2026 siamhrbp Organization';
      Object.assign(footer.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.96)',
        borderTop: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.02em',
        lineHeight: '1',
        zIndex: '9999',
        pointerEvents: 'none',
        userSelect: 'none',
        backdropFilter: 'blur(6px)'
      });
      document.body.appendChild(footer);
    };
    if (document.body) render();
    else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  window.OrgFlowSupabaseService = new OrgFlowSupabaseService();
  ensureBrandFooter();
})();
