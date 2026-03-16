import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensure the authenticated user has a row in public.users (for saved_targets FK).
 * Call after getuser() when performing user-scoped writes.
 */
export async function ensureAppUser(
  supabase: SupabaseClient,
  authUserId: string,
  email: string
): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    { id: authUserId, email, plan: "basic" },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message ?? "Failed to ensure user record");
}
