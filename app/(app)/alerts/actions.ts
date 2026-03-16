"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import type { UserAlert, UserAlertType } from "@/types/database";

export async function getAlerts(): Promise<UserAlert[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  await ensureAppUser(supabase, user.id, user.email ?? "");
  const { data, error } = await supabase
    .from("user_alerts")
    .select("id, user_id, alert_type, company_id, channel, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    alert_type: r.alert_type as UserAlertType,
    company_id: r.company_id,
    channel: r.channel as "email" | "slack",
    created_at: r.created_at,
  }));
}

export async function createAlert(params: {
  alert_type: UserAlertType;
  company_id?: string | null;
  channel?: "email" | "slack";
}): Promise<{ error?: string; alert?: UserAlert }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  await ensureAppUser(supabase, user.id, user.email ?? "");
  const { data, error } = await supabase
    .from("user_alerts")
    .insert({
      user_id: user.id,
      alert_type: params.alert_type,
      company_id: params.company_id ?? null,
      channel: params.channel ?? "email",
    })
    .select("id, user_id, alert_type, company_id, channel, created_at")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/alerts");
  if (!data) return {};
  return {
    alert: {
      id: data.id,
      user_id: data.user_id,
      alert_type: data.alert_type as UserAlertType,
      company_id: data.company_id,
      channel: data.channel as "email" | "slack",
      created_at: data.created_at,
    },
  };
}

export async function deleteAlert(alertId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("user_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return {};
}
