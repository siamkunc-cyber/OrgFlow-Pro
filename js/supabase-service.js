/**
 * OrgFlow Pro V2 - Supabase data/auth service
 * The UI remains usable in Demo/Local mode when Supabase is not configured.
 */
(function () {
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
          { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
        );
        this.client.auth.getSession().then(({ data }) => { this.session = data.session || null; });
        this.client.auth.onAuthStateChange((_event, session) => {
          this.session = session || null;
          window.dispatchEvent(new CustomEvent('orgflow-auth-changed', { detail: { session: this.session } }));
        });
      }
    }

    isConfigured() { return this.configured; }
    isAuthenticated() { return Boolean(this.session); }
    getUser() { return this.session ? this.session.user : null; }

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

    async listEmployees() {
      if (!this.configured || !this.isAuthenticated()) return null;
      const { data, error } = await this.client
        .from('org_employees')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return (data || []).map(this.fromRow);
    }

    async upsertEmployees(items) {
      if (!this.configured || !this.isAuthenticated()) return false;
      if (!Array.isArray(items)) return false;
      const rows = items.map(this.toRow);
      const { error } = await this.client.from('org_employees').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      return true;
    }

    async deleteEmployee(id) {
      if (!this.configured || !this.isAuthenticated()) return false;
      const { error } = await this.client.from('org_employees').delete().eq('id', id);
      if (error) throw error;
      return true;
    }

    async replaceEmployees(items) {
      if (!this.configured || !this.isAuthenticated()) return false;
      const { error: deleteError } = await this.client.from('org_employees').delete().neq('id', '__ORG_FLOW_NEVER_MATCH__');
      if (deleteError) throw deleteError;
      if (items.length) await this.upsertEmployees(items);
      return true;
    }

    toRow(item) {
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

    fromRow(row) {
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

  window.OrgFlowSupabaseService = new OrgFlowSupabaseService();
})();
