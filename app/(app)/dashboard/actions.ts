"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { savedLimit, type Plan } from "@/lib/plan-gating";

async function getUserPlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Plan> {
  const { data } = await supabase.from("users").select("plan").eq("id", userId).single();
  if (data?.plan === "pro" || data?.plan === "basic" || data?.plan === "free") return data.plan as Plan;
  return "free";
}

export async function saveCompany(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  await ensureAppUser(supabase, user.id, user.email ?? "");
  const plan = await getUserPlan(supabase, user.id);
  if (plan !== "pro") {
    const { count } = await supabase.from("saved_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= savedLimit(plan)) return { error: "saved_limit" };
  }
  const { error } = await supabase.from("saved_targets").insert({
    user_id: user.id,
    company_id: companyId,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/saved");
  return {};
}

export async function unsaveCompany(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("saved_targets")
    .delete()
    .eq("user_id", user.id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/saved");
  return {};
}
