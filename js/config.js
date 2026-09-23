/*
 * OrgFlow Pro V2 - Runtime configuration
 *
 * IMPORTANT:
 * - Put only the Supabase project URL and publishable/anon key here.
 * - NEVER put the Supabase service_role/secret key in this file.
 * - Leaving these values blank keeps the app in Demo/Local mode.
 */
window.ORG_FLOW_CONFIG = Object.assign({
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',
  AUTO_LOAD_CLOUD: true
}, window.ORG_FLOW_CONFIG || {});
