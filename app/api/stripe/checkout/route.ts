import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/plan-gating";

const PRICE_ID_BY_PLAN: Record<"basic" | "pro", string | undefined> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const requestedPlan = formData.get("plan");
  const plan = (requestedPlan === "basic" || requestedPlan === "pro" ? requestedPlan : "pro") as Exclude<Plan, "free">;
  const priceId = PRICE_ID_BY_PLAN[plan];
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          plan === "basic"
            ? "Stripe not configured (missing STRIPE_BASIC_PRICE_ID)"
            : "Stripe not configured (missing STRIPE_PRO_PRICE_ID)",
      },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    // Prefer canonical app URL so Stripe Checkout session has correct return domain (helps avoid 403 on checkout.stripe.com).
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      request.headers.get("origin") ||
      request.url.split("/").slice(0, 3).join("/");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account?success=1`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });

    if (session.url) {
      return NextResponse.redirect(session.url);
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe checkout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
