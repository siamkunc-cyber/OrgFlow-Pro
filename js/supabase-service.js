/**
 * OrgFlow Cloud Data Service
 * Storage: Supabase Postgres + Supabase Auth
 *
 * The browser uses the public/publishable key only.
 * Access to employee rows is protected by Supabase Auth + RLS.
 */
(function () {
  const cfg = window.ORG_FLOW_CONFIG || {};
  const ready =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR-PUBLISHABLE");

  window.OrgFlowCloud = {
    configured: !!ready,
    client: null,
    user: null,

    init() {
      if (!this.configured) return false;
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase JS client is not loaded.");
        return false;
      }
      this.client = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        }
      );
      return true;
    },

    async getSession() {
      if (!this.client) return null;
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      this.user = data.session ? data.session.user : null;
      return data.session;
    },

    onAuthStateChange(callback) {
      if (!this.client) return { data: { subscription: { unsubscribe() {} } } };
      return this.client.auth.onAuthStateChange((event, session) => {
        this.user = session ? session.user : null;
        callback(event, session);
      });
    },

    async signIn(email, password) {
      if (!this.client) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.user = data.user;
      return data;
    },

    async signOut() {
      if (!this.client) return;
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      this.user = null;
    },

    toDb(row) {
      return {
        id: String(row.id || "").trim(),
        name: row.name || "",
        position: row.position || "",
        department: row.department || "General",
        reports_to: row.reportsTo || null,
        role_level: row.roleLevel || "Staff",
        email: row.email || null,
        phone: row.phone || null,
        avatar_url: row.avatarUrl || null
      };
    },

    fromDb(row) {
      return {
        id: row.id,
        name: row.name || "",
        position: row.position || "",
        department: row.department || "General",
        reportsTo: row.reports_to || "",
        roleLevel: row.role_level || "Staff",
        email: row.email || "",
        phone: row.phone || "",
        avatarUrl: row.avatar_url || ""
      };
    },

    async loadEmployees() {
      if (!this.client) throw new Error("Supabase ยังไม่ได้ตั้งค่า");
      const { data, error } = await this.client
        .from("org_employees")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      return (data || []).map(r => this.fromDb(r));
    },

    async upsertEmployees(rows) {
      if (!this.client) throw new Error("Supabase ยังไม่ได้ตั้งค่า");
      if (!rows || rows.length === 0) return;
      const payload = rows.map(r => this.toDb(r));
      const { error } = await this.client
        .from("org_employees")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },

    async replaceEmployees(rows) {
      if (!this.client) throw new Error("Supabase ยังไม่ได้ตั้งค่า");
      const { error: deleteError } = await this.client
        .from("org_employees")
        .delete()
        .not("id", "is", null);
      if (deleteError) throw deleteError;
      if (rows && rows.length) await this.upsertEmployees(rows);
    },

    async deleteEmployee(id) {
      if (!this.client) throw new Error("Supabase ยังไม่ได้ตั้งค่า");
      const { error } = await this.client
        .from("org_employees")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },

    async clearEmployees() {
      return this.replaceEmployees([]);
    }
  };
})();
