import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { normalizePlan } from "@/lib/plan-gating";
import { Button } from "@/components/ui/button";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await ensureAppUser(supabase, user.id, user.email ?? "");
  const { data: profile } = user
    ? await supabase.from("users").select("plan").eq("id", user.id).single()
    : { data: null };
  const normalizedPlan = normalizePlan(profile?.plan);
  const plan = normalizedPlan === "pro" ? "Founder Pro" : normalizedPlan === "basic" ? "Basic" : "Free";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Account</h1>
      <div className="space-y-2 text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Email:</span>{" "}
          {user?.email ?? "—"}
        </p>
        <p>
          <span className="font-medium text-foreground">Plan:</span> {plan}
        </p>
        {plan !== "Founder Pro" && (
          <p className="pt-4">
            <Link href="/pricing">
              <Button>{plan === "Free" ? "Choose a paid plan" : "Upgrade to Founder Pro"}</Button>
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
