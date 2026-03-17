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
    /**
     * Prefer the actual request origin/host for return URLs.
     *
     * Why: Next.js server-side POSTs can omit the Origin header, and Vercel sets VERCEL_URL
     * to the deployment hostname (often a preview URL). If we use that, Stripe Checkout
     * sessions end up tied to a preview domain even when the user is on the custom domain,
     * which can lead to confusing redirects and (in some cases) 403s on checkout.stripe.com.
     *
     * Order:
     * - NEXT_PUBLIC_APP_URL (explicit canonical, recommended)
     * - Origin header (best signal of current user-facing domain)
     * - Host header (reconstruct https://<host>)
     * - VERCEL_URL (fallback)
     * - request URL origin (last resort)
     */
    const explicit = process.env.NEXT_PUBLIC_APP_URL || null;
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const inferredFromHost = host ? `https://${host}` : null;
    const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    const requestOrigin = request.url.split("/").slice(0, 3).join("/");

    const baseUrl = explicit || origin || inferredFromHost || vercel || requestOrigin;
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
      // The pricing page submits a POST form to this route. A 307 redirect would
      // preserve the method and attempt to POST to checkout.stripe.com, which Stripe rejects.
      // Use 303 so the browser follows up with a GET to the Checkout URL.
      return NextResponse.redirect(session.url, 303);
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
