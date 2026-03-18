"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { revalidatePath } from "next/cache";
import type { CompanyRelationshipContact, CouldMakeIntro } from "@/types/database";

export async function getCompanyRelationshipContacts(companyId: string): Promise<CompanyRelationshipContact[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  await ensureAppUser(supabase, user.id, user.email ?? "");
  const { data, error } = await supabase
    .from("company_relationship_contacts")
    .select("id, user_id, company_id, contact_name, role, company, relationship_to_you, could_make_intro, notes, created_at")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as CompanyRelationshipContact[];
}

export async function addCompanyRelationshipContact(params: {
  companyId: string;
  contact_name: string;
  role?: string;
  company?: string;
  relationship_to_you?: string;
  could_make_intro: CouldMakeIntro;
  notes?: string;
}): Promise<{ error?: string; contact?: CompanyRelationshipContact }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  await ensureAppUser(supabase, user.id, user.email ?? "");

  const contactName = params.contact_name.trim();
  if (!contactName) return { error: "Contact name is required." };

  const { data, error } = await supabase
    .from("company_relationship_contacts")
    .insert({
      user_id: user.id,
      company_id: params.companyId,
      contact_name: contactName,
      role: params.role?.trim() || null,
      company: params.company?.trim() || null,
      relationship_to_you: params.relationship_to_you?.trim() || null,
      could_make_intro: params.could_make_intro,
      notes: params.notes?.trim() || null,
    })
    .select("id, user_id, company_id, contact_name, role, company, relationship_to_you, could_make_intro, notes, created_at")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/companies/${params.companyId}`);
  return { contact: data as CompanyRelationshipContact };
}

