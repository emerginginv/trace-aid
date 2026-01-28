// Runtime-safe backend client wrapper.
//
// In some preview environments `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
// can be undefined, which causes `createClient()` to throw "supabaseUrl is required".
//
// We DO NOT modify the auto-generated client.ts; we alias imports to this file instead.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const env = import.meta.env as Record<string, string | undefined>;

// Public fallbacks (non-secret). Used only if env injection fails.
const FALLBACK_PROJECT_ID = "uxmezklevgkqelahibqy";
const FALLBACK_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bWV6a2xldmdrcWVsYWhpYnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA2MDksImV4cCI6MjA3NjQ1NjYwOX0.V2dmjB-smlz9dcy3f0pIlgQKGXx01C1cYnczA9rigOQ";

const SUPABASE_URL =
  env.VITE_SUPABASE_URL?.trim() ||
  (env.VITE_SUPABASE_PROJECT_ID
    ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
    : FALLBACK_URL);

const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || FALLBACK_PUBLISHABLE_KEY;

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "[backend-client] Missing backend env vars in this preview; using fallback configuration."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
