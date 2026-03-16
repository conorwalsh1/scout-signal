import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for workers and server-only code.
 * Do not use in browser or in request-scoped code that should respect user session.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY (set in .env.local)");
  return createClient(url, key);
}
